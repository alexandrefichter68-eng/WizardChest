import { Chess, type Move, type Square } from 'chess.js';
import { difficultyFromOpponent, pickMoveWithSkillNoise } from '@/engine/difficulty';
import { findBestMove } from '@/engine/search';
import { createSeededRng, randomFloat } from '@/utils/random';
import type { PlayStyle } from '@/types';

export interface AiMoveRequest {
  fen: string;
  aiDepth: number;
  aiSkillNoise: number;
  style: PlayStyle;
  /** A square the AI must not capture on this turn (the player's "Bouclier" spell). */
  protectedSquare?: Square | null;
}

export interface AiMoveResponse {
  move: Move;
  thinkingTimeMs: number;
  depthReached: number;
}

/**
 * Natural-feeling thinking windows (ms) keyed by depth, so the AI never answers instantly and
 * stronger opponents visibly "think" longer, without ever blocking on a fixed delay if the
 * search itself already took that long. Kept short overall — a human-like pause, not a wait.
 */
function targetThinkingWindowMs(depth: number): [number, number] {
  if (depth <= 2) return [400, 900];
  if (depth <= 4) return [600, 1300];
  return [900, 1800];
}

export async function computeAiMove(request: AiMoveRequest): Promise<AiMoveResponse> {
  const chess = new Chess(request.fen);
  const difficulty = difficultyFromOpponent(request.aiDepth, request.aiSkillNoise, request.style);
  const startedAt = Date.now();

  const result = findBestMove(chess, {
    maxDepth: difficulty.maxDepth,
    timeBudgetMs: difficulty.timeBudgetMs,
    style: difficulty.style,
  });

  const eligibleMoveScores = request.protectedSquare
    ? result.rootMoveScores.filter((entry) => entry.move.to !== request.protectedSquare)
    : result.rootMoveScores;
  // If the shield somehow protects every legal move (never happens in practice — it only ever
  // blocks captures on one square), fall back to the full list rather than throwing.
  const candidateScores = eligibleMoveScores.length > 0 ? eligibleMoveScores : result.rootMoveScores;

  const chosenMove = pickMoveWithSkillNoise(candidateScores, difficulty.skillNoise, `${request.fen}:${startedAt}`);
  const computeElapsedMs = Date.now() - startedAt;

  const [minWindow, maxWindow] = targetThinkingWindowMs(request.aiDepth);
  const rng = createSeededRng(`delay:${request.fen}:${startedAt}`);
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
