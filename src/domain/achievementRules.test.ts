import { evaluateAchievements } from '@/domain/achievementRules';

const baseCtx = {
  result: 'win' as const,
  endReason: 'checkmate' as const,
  moveCount: 40,
  winStreakAfter: 1,
  gamesPlayedAfter: 1,
  divisionAfter: 'bois' as const,
  divisionChangedUp: false,
  didPromotePawn: false,
  checkmateDeliveredByKnight: false,
};

describe('achievementRules', () => {
  it('unlocks first_win on any win', () => {
    expect(evaluateAchievements(baseCtx)).toContain('first_win');
  });

  it('does not unlock first_win on a loss', () => {
    expect(evaluateAchievements({ ...baseCtx, result: 'loss' })).not.toContain('first_win');
  });

  it('unlocks quick_mate only for a fast checkmate win', () => {
    expect(evaluateAchievements({ ...baseCtx, moveCount: 20 })).toContain('quick_mate');
    expect(evaluateAchievements({ ...baseCtx, moveCount: 60 })).not.toContain('quick_mate');
    expect(evaluateAchievements({ ...baseCtx, moveCount: 20, endReason: 'resignation' })).not.toContain('quick_mate');
  });

  it('unlocks win_streak_3 exactly at 3, and win_streak_10 at 10+', () => {
    expect(evaluateAchievements({ ...baseCtx, winStreakAfter: 3 })).toContain('win_streak_3');
    expect(evaluateAchievements({ ...baseCtx, winStreakAfter: 2 })).not.toContain('win_streak_3');
    expect(evaluateAchievements({ ...baseCtx, winStreakAfter: 12 })).toContain('win_streak_10');
  });

  it('unlocks division achievements based on the division reached', () => {
    const gold = evaluateAchievements({ ...baseCtx, divisionAfter: 'or' });
    expect(gold).toContain('reach_gold');
    expect(gold).not.toContain('reach_diamond');

    const supreme = evaluateAchievements({ ...baseCtx, divisionAfter: 'sorcier_supreme' });
    expect(supreme).toEqual(expect.arrayContaining(['reach_gold', 'reach_diamond', 'reach_supreme_wizard']));
  });

  it('unlocks first_promotion only when divisionChangedUp is true', () => {
    expect(evaluateAchievements({ ...baseCtx, divisionChangedUp: true })).toContain('first_promotion');
    expect(evaluateAchievements(baseCtx)).not.toContain('first_promotion');
  });

  it('unlocks games_50 once the threshold is reached', () => {
    expect(evaluateAchievements({ ...baseCtx, gamesPlayedAfter: 50 })).toContain('games_50');
    expect(evaluateAchievements({ ...baseCtx, gamesPlayedAfter: 49 })).not.toContain('games_50');
  });

  it('unlocks promote_piece and checkmate_with_knight from their flags', () => {
    expect(evaluateAchievements({ ...baseCtx, didPromotePawn: true })).toContain('promote_piece');
    expect(evaluateAchievements({ ...baseCtx, checkmateDeliveredByKnight: true })).toContain('checkmate_with_knight');
  });

  it('unlocks comeback_draw only for a long drawn game', () => {
    expect(evaluateAchievements({ ...baseCtx, result: 'draw', moveCount: 70 })).toContain('comeback_draw');
    expect(evaluateAchievements({ ...baseCtx, result: 'draw', moveCount: 20 })).not.toContain('comeback_draw');
  });
});
