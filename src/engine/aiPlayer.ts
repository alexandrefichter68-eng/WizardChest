import { Chess, type Move, type Square } from 'chess.js';
import { difficultyFromOpponent, pickMoveWithSkillNoise } from '@/engine/difficulty';
import { findBestMove, type SearchOptions } from '@/engine/search';
import { findBestMoveInWorker, isSearchWorkerSupported } from '@/engine/searchWorkerClient';
import { createSeededRng, randomFloat } from '@/utils/random';
import type { PieceColor, PlayStyle } from '@/types';

export interface AiMoveRequest {
  fen: string;
  aiDepth: number;
  aiSkillNoise: number;
  style: PlayStyle;
  /** A square the AI must not capture on this turn (the player's "Bouclier" spell). */
  protectedSquare?: Square | null;
  /** A square the AI's piece must not move from this turn (the player's "Entrave" spell). */
  frozenSquare?: Square | null;
  /** This color's non-king, non-pawn pieces are evaluated as pawns (the player's "Camouflage" spell). */
  disguisedColor?: PieceColor | null;
}

export interface AiMoveResponse {
  move: Move;
  thinkingTimeMs: number;
  depthReached: number;
}

/**
 * Natural-feeling thinking windows (ms) keyed by depth, so a fast/shallow search still pauses
 * briefly instead of answering instantly. Kept short on purpose: for the deeper searches (division
 * ceiling and up) the real computation alone already takes 1.5-2s+, so `remainingMs` below is
 * almost always 0 for those — this window only ever adds *real* extra wait for the fast, weak
 * bots that would otherwise feel robotic. (Previously up to 3000ms, plus an 18%-chance 500-2200ms
 * "long think" bonus stacked on top — that combination is what made even a fast search feel
 * sluggish; both are trimmed hard here.)
 */
function targetThinkingWindowMs(depth: number): [number, number] {
  if (depth <= 2) return [150, 450];
  if (depth <= 4) return [200, 650];
  return [250, 800];
}

export async function computeAiMove(request: AiMoveRequest): Promise<AiMoveResponse> {
  const difficulty = difficultyFromOpponent(request.aiDepth, request.aiSkillNoise, request.style);
  const startedAt = Date.now();

  const searchOptions: SearchOptions = {
    maxDepth: difficulty.maxDepth,
    timeBudgetMs: difficulty.timeBudgetMs,
    style: difficulty.style,
    disguisedColor: request.disguisedColor ?? null,
  };

  // The worker is the real fix for the main-thread freeze (see `searchWorkerClient.ts`) — falling
  // back to the direct, main-thread search keeps native working (Metro's Worker support is
  // web-only) and keeps web itself working even if the worker bundle fails to load for some reason.
  const result = isSearchWorkerSupported()
    ? await findBestMoveInWorker(request.fen, searchOptions).catch(() => findBestMove(new Chess(request.fen), searchOptions))
    : await findBestMove(new Chess(request.fen), searchOptions);

  let eligibleMoveScores = request.protectedSquare
    ? result.rootMoveScores.filter((entry) => entry.move.to !== request.protectedSquare)
    : result.rootMoveScores;
  if (request.frozenSquare) {
    eligibleMoveScores = eligibleMoveScores.filter((entry) => entry.move.from !== request.frozenSquare);
  }
  // If the shield/entrave combination somehow rules out every legal move, fall back to the full
  // list rather than throwing.
  const candidateScores = eligibleMoveScores.length > 0 ? eligibleMoveScores : result.rootMoveScores;

  const chosenMove = pickMoveWithSkillNoise(candidateScores, difficulty.skillNoise, `${request.fen}:${startedAt}`);
  const computeElapsedMs = Date.now() - startedAt;

  const rng = createSeededRng(`delay:${request.fen}:${startedAt}`);
  const [minWindow, maxWindow] = targetThinkingWindowMs(request.aiDepth);
  const targetDelayMs = randomFloat(rng, minWindow, maxWindow);
  const remainingMs = Math.max(0, targetDelayMs - computeElapsedMs);
  if (remainingMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingMs));
  }

  return {
    move: chosenMove,
    thinkingTimeMs: Date.now() - startedAt,
    depthReached: result.depthReached,
  };
}
