import type { Move } from 'chess.js';
import type { RootMoveScore } from '@/engine/search';
import { createSeededRng } from '@/utils/random';
import type { PlayStyle } from '@/types';

export interface DifficultyProfile {
  maxDepth: number;
  timeBudgetMs: number;
  skillNoise: number;
  style: PlayStyle | null;
}

/**
 * Converts an opponent's division-derived AI parameters into concrete search settings.
 * Time budget scales with depth so weak opponents also "think" fast, while strong ones get
 * more wall-clock time to actually reach their higher depth ceiling.
 */
export function difficultyFromOpponent(aiDepth: number, aiSkillNoise: number, style: PlayStyle): DifficultyProfile {
  const timeBudgetMs = Math.min(350 + aiDepth * 220, 2800);
  return { maxDepth: aiDepth, timeBudgetMs, skillNoise: aiSkillNoise, style };
}

const NOISE_WINDOW_CP = 120;

/**
 * With probability `skillNoise`, deliberately plays a slightly-inferior-but-still-reasonable
 * move instead of the engine's top choice — moves are only drawn from those within
 * `NOISE_WINDOW_CP` centipawns of the best score, so a weak opponent never hangs material for
 * no reason, it just occasionally picks the 2nd/3rd best plan instead of the objective best one.
 */
export function pickMoveWithSkillNoise(
  rootMoveScores: RootMoveScore[],
  skillNoise: number,
  rngSeed: string | number,
): Move {
  if (rootMoveScores.length === 0) {
    throw new Error('pickMoveWithSkillNoise called with no candidate moves');
  }
  const best = rootMoveScores[0]!;
  const rng = createSeededRng(rngSeed);
  if (rng() >= skillNoise) return best.move;

  const candidates = rootMoveScores.filter((entry) => best.scoreCp - entry.scoreCp <= NOISE_WINDOW_CP);
  if (candidates.length <= 1) return best.move;

  const weights = candidates.map((_, idx) => 1 / (idx + 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let threshold = rng() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    threshold -= weights[i]!;
    if (threshold <= 0) return candidates[i]!.move;
  }
  return best.move;
}
