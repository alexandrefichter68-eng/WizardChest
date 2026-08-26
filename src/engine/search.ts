import type { Chess, Move } from 'chess.js';
import { evaluatePosition, PIECE_VALUES } from '@/engine/evaluation';
import type { PlayStyle } from '@/types';

export const MATE_SCORE = 100000;
const QUIESCENCE_MAX_PLY = 6;
const DEADLINE_CHECK_INTERVAL = 1024;

class SearchTimeout extends Error {}

interface NodeCounter {
  count: number;
}

type KillerSlot = (Move | undefined)[];

function moveKey(m: Move): string {
  return `${m.from}${m.to}${m.promotion ?? ''}`;
}

function scoreMoveForOrdering(m: Move, killers: KillerSlot | undefined, historyTable: Map<string, number>): number {
  if (m.captured) {
    return 10_000 + PIECE_VALUES[m.captured] * 10 - PIECE_VALUES[m.piece];
  }
  if (m.promotion) return 9_000;
  if (killers?.some((k) => k && moveKey(k) === moveKey(m))) return 8_000;
  return historyTable.get(moveKey(m)) ?? 0;
}

function orderMoves(moves: Move[], killers: KillerSlot | undefined, historyTable: Map<string, number>): Move[] {
  return [...moves].sort(
    (a, b) => scoreMoveForOrdering(b, killers, historyTable) - scoreMoveForOrdering(a, killers, historyTable),
  );
}

function checkDeadline(nodeCounter: NodeCounter, deadline: number): void {
  nodeCounter.count += 1;
  if (nodeCounter.count % DEADLINE_CHECK_INTERVAL === 0 && Date.now() > deadline) {
    throw new SearchTimeout();
  }
}

function quiescence(
  chess: Chess,
  alpha: number,
  beta: number,
  style: PlayStyle | null,
  deadline: number,
  nodeCounter: NodeCounter,
  ply = 0,
): number {
  checkDeadline(nodeCounter, deadline);
  const standPat = evaluatePosition(chess, style);
  if (standPat >= beta) return beta;
  let localAlpha = alpha;
  if (standPat > localAlpha) localAlpha = standPat;
  if (ply >= QUIESCENCE_MAX_PLY) return localAlpha;

  const tacticalMoves = chess.moves({ verbose: true }).filter((m) => m.captured || m.promotion);
  const ordered = orderMoves(tacticalMoves, undefined, new Map());
  for (const m of ordered) {
    chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    let score: number;
    try {
      score = -quiescence(chess, -beta, -localAlpha, style, deadline, nodeCounter, ply + 1);
    } finally {
      chess.undo();
    }
    if (score >= beta) return beta;
    if (score > localAlpha) localAlpha = score;
  }
  return localAlpha;
}

function negamax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  style: PlayStyle | null,
  killers: KillerSlot[],
  historyTable: Map<string, number>,
  deadline: number,
  nodeCounter: NodeCounter,
): number {
  checkDeadline(nodeCounter, deadline);

  if (depth === 0) {
    return quiescence(chess, alpha, beta, style, deadline, nodeCounter);
  }

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) {
    if (chess.inCheck()) return -(MATE_SCORE - (100 - depth));
    return 0;
  }

  let localAlpha = alpha;
  let best = -Infinity;
  const ordered = orderMoves(moves, killers[depth], historyTable);

  for (const m of ordered) {
    chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    let score: number;
    try {
      score = -negamax(chess, depth - 1, -beta, -localAlpha, style, killers, historyTable, deadline, nodeCounter);
    } finally {
      chess.undo();
    }

    if (score > best) best = score;
    if (score > localAlpha) localAlpha = score;
    if (localAlpha >= beta) {
      if (!m.captured) {
        const slot = killers[depth] ?? [];
        slot[1] = slot[0];
        slot[0] = m;
        killers[depth] = slot;
        historyTable.set(moveKey(m), (historyTable.get(moveKey(m)) ?? 0) + depth * depth);
      }
      break;
    }
  }

  return best;
}

export interface RootMoveScore {
  move: Move;
  scoreCp: number;
}

export interface SearchResult {
  bestMove: Move;
  rootMoveScores: RootMoveScore[];
  depthReached: number;
  evaluatedNodes: number;
}

export interface SearchOptions {
  maxDepth: number;
  timeBudgetMs: number;
  style?: PlayStyle | null;
}

/**
 * Time-bounded iterative-deepening negamax with alpha-beta pruning and a capture-only
 * quiescence search at the leaves. Chosen over binding a native Stockfish build (see
 * docs/AI_ENGINE_CHOICE.md for why) — it runs entirely in JS/TS, needs no native module or
 * WASM, and its playing strength scales with `maxDepth`/`timeBudgetMs`.
 */
export function findBestMove(chess: Chess, options: SearchOptions): SearchResult {
  const rootMoves = chess.moves({ verbose: true });
  if (rootMoves.length === 0) {
    throw new Error('findBestMove called on a position with no legal moves');
  }

  const deadline = Date.now() + options.timeBudgetMs;
  const style = options.style ?? null;
  const killers: KillerSlot[] = [];
  const historyTable = new Map<string, number>();
  const nodeCounter: NodeCounter = { count: 0 };

  let lastCompletedScores: RootMoveScore[] = rootMoves.map((move) => ({ move, scoreCp: 0 }));
  let depthReached = 0;

  for (let depth = 1; depth <= options.maxDepth; depth++) {
    const ordered = orderMoves(rootMoves, killers[depth], historyTable);
    const scoresThisDepth: RootMoveScore[] = [];
    let alpha = -Infinity;
    const beta = Infinity;
    let timedOut = false;

    for (const m of ordered) {
      chess.move({ from: m.from, to: m.to, promotion: m.promotion });
      let score: number;
      try {
        score = -negamax(chess, depth - 1, -beta, -alpha, style, killers, historyTable, deadline, nodeCounter);
      } catch (err) {
        chess.undo();
        if (err instanceof SearchTimeout) {
          timedOut = true;
          break;
        }
        throw err;
      }
      chess.undo();
      scoresThisDepth.push({ move: m, scoreCp: score });
      if (score > alpha) alpha = score;
    }

    if (timedOut) break;

    scoresThisDepth.sort((a, b) => b.scoreCp - a.scoreCp);
    lastCompletedScores = scoresThisDepth;
    depthReached = depth;

    const best = scoresThisDepth[0];
    if (best && Math.abs(best.scoreCp) > MATE_SCORE - 200) break;
    if (Date.now() > deadline) break;
  }

  const bestMove = lastCompletedScores[0]?.move ?? rootMoves[0]!;
  return {
    bestMove,
    rootMoveScores: lastCompletedScores,
    depthReached: Math.max(depthReached, 1),
    evaluatedNodes: nodeCounter.count,
  };
}
