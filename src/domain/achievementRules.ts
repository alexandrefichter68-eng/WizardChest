import type { DivisionId, GameEndReason, GameResultKind } from '@/types';

const GOLD_AND_ABOVE: DivisionId[] = ['or', 'platine', 'diamant', 'maitre', 'grand_maitre', 'sorcier_supreme'];
const DIAMOND_AND_ABOVE: DivisionId[] = ['diamant', 'maitre', 'grand_maitre', 'sorcier_supreme'];

export interface AchievementContext {
  result: GameResultKind;
  endReason: GameEndReason;
  moveCount: number;
  winStreakAfter: number;
  gamesPlayedAfter: number;
  divisionAfter: DivisionId;
  divisionChangedUp: boolean;
  didPromotePawn: boolean;
  checkmateDeliveredByKnight: boolean;
}

/**
 * Pure rule evaluation for post-game achievement unlocks. Idempotent by design (e.g. "first_win"
 * fires on every win) — the rewards store is responsible for ignoring already-unlocked ids.
 */
export function evaluateAchievements(ctx: AchievementContext): string[] {
  const unlocked: string[] = [];

  if (ctx.result === 'win') unlocked.push('first_win');
  if (ctx.result === 'win' && ctx.endReason === 'checkmate' && ctx.moveCount <= 24) unlocked.push('quick_mate');
  if (ctx.winStreakAfter === 3) unlocked.push('win_streak_3');
  if (ctx.winStreakAfter >= 10) unlocked.push('win_streak_10');
  if (ctx.divisionChangedUp) unlocked.push('first_promotion');
  if (GOLD_AND_ABOVE.includes(ctx.divisionAfter)) unlocked.push('reach_gold');
  if (DIAMOND_AND_ABOVE.includes(ctx.divisionAfter)) unlocked.push('reach_diamond');
  if (ctx.divisionAfter === 'sorcier_supreme') unlocked.push('reach_supreme_wizard');
  if (ctx.result === 'draw' && ctx.moveCount >= 60) unlocked.push('comeback_draw');
  if (ctx.gamesPlayedAfter >= 50) unlocked.push('games_50');
  if (ctx.didPromotePawn) unlocked.push('promote_piece');
  if (ctx.checkmateDeliveredByKnight) unlocked.push('checkmate_with_knight');

  return unlocked;
}
