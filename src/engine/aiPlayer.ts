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
  /** A square the AI's piece must not move from this turn (the player's "Entrave" spell). */
  frozenSquare?: Square | null;
}

export interface AiMoveResponse {
  move: Move;
  thinkingTimeMs: number;
  depthReached: number;
}

/**
 * Natural-feeling thinking windows (ms) keyed by depth, so the AI never answers instantly and
 * stronger opponents visibly "think" longer, without ever blocking on a fixed delay if the
 * search itself already took that long. Widened and randomized further below (an occasional
 * extra "long think" pause) so the delay never feels metronomic from one move to the next.
 */
function targetThinkingWindowMs(depth: number): [number, number] {
  if (depth <= 2) return [250, 1400];
  if (depth <= 4) return [400, 2200];
  return [600, 3000];
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
  let targetDelayMs = randomFloat(rng, minWindow, maxWindow);
  // ~18% of the time, throw in an extra "long think" pause so the timing never settles into a
  // predictable rhythm — more variance than a single uniform window can give on its own.
  if (randomFloat(rng, 0, 1) < 0.18) {
    targetDelayMs += randomFloat(rng, 500, 2200);
  }
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
