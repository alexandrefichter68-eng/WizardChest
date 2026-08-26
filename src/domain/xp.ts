import type { GameEndReason, GameResultKind } from '@/types';

/** XP required to go from level N to N+1 (quadratic curve, gentle early game). */
export function xpForLevel(level: number): number {
  return Math.round(80 * level + 20 * level * level);
}

export function levelFromTotalXp(totalXp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  let level = 1;
  let remaining = totalXp;
  let needed = xpForLevel(level);
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = xpForLevel(level);
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: needed };
}

export interface XpBreakdown {
  base: number;
  resultBonus: number;
  streakBonus: number;
  quickWinBonus: number;
  total: number;
}

export function computeXpGain(params: {
  result: GameResultKind;
  endReason: GameEndReason;
  winStreak: number;
  moveCount: number;
  opponentDivisionOrder: number;
}): XpBreakdown {
  const base = 15 + params.opponentDivisionOrder * 4;
  const resultBonus = params.result === 'win' ? 35 : params.result === 'draw' ? 10 : 5;
  const streakBonus = params.result === 'win' ? Math.min(params.winStreak, 10) * 3 : 0;
  const quickWinBonus = params.result === 'win' && params.endReason === 'checkmate' && params.moveCount <= 24 ? 20 : 0;
  const total = base + resultBonus + streakBonus + quickWinBonus;
  return { base, resultBonus, streakBonus, quickWinBonus, total };
}

export const DAILY_REWARD_BASE_XP = 40;
export const DAILY_REWARD_STREAK_BONUS = 10;
export const DAILY_REWARD_MAX_STREAK_BONUS_DAYS = 7;

export function computeDailyRewardXp(streakDay: number): number {
  const cappedStreak = Math.min(streakDay, DAILY_REWARD_MAX_STREAK_BONUS_DAYS);
  return DAILY_REWARD_BASE_XP + cappedStreak * DAILY_REWARD_STREAK_BONUS;
}
