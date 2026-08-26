import { computeDailyRewardXp, computeXpGain, levelFromTotalXp, xpForLevel } from '@/domain/xp';

describe('xp', () => {
  it('xpForLevel grows as level increases', () => {
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1));
    expect(xpForLevel(10)).toBeGreaterThan(xpForLevel(5));
  });

  it('levelFromTotalXp starts at level 1 with zero XP', () => {
    const result = levelFromTotalXp(0);
    expect(result.level).toBe(1);
    expect(result.xpIntoLevel).toBe(0);
  });

  it('levelFromTotalXp advances a level once the threshold is crossed', () => {
    const levelOneCost = xpForLevel(1);
    const result = levelFromTotalXp(levelOneCost);
    expect(result.level).toBe(2);
    expect(result.xpIntoLevel).toBe(0);
  });

  it('levelFromTotalXp is consistent: xpIntoLevel is always less than xpForNextLevel', () => {
    for (const totalXp of [0, 50, 500, 5000, 50000]) {
      const result = levelFromTotalXp(totalXp);
      expect(result.xpIntoLevel).toBeLessThan(result.xpForNextLevel);
    }
  });

  it('computeXpGain gives more XP for a win than a loss, all else equal', () => {
    const base = { endReason: 'checkmate' as const, winStreak: 0, moveCount: 40, opponentDivisionOrder: 2 };
    const win = computeXpGain({ ...base, result: 'win' });
    const loss = computeXpGain({ ...base, result: 'loss' });
    expect(win.total).toBeGreaterThan(loss.total);
  });

  it('computeXpGain rewards a quick checkmate win with a bonus', () => {
    const base = { result: 'win' as const, endReason: 'checkmate' as const, winStreak: 0, opponentDivisionOrder: 2 };
    const quick = computeXpGain({ ...base, moveCount: 15 });
    const slow = computeXpGain({ ...base, moveCount: 60 });
    expect(quick.quickWinBonus).toBeGreaterThan(0);
    expect(slow.quickWinBonus).toBe(0);
    expect(quick.total).toBeGreaterThan(slow.total);
  });

  it('computeXpGain caps the win-streak bonus contribution', () => {
    const base = { result: 'win' as const, endReason: 'resignation' as const, moveCount: 40, opponentDivisionOrder: 2 };
    const streak10 = computeXpGain({ ...base, winStreak: 10 });
    const streak50 = computeXpGain({ ...base, winStreak: 50 });
    expect(streak50.streakBonus).toBe(streak10.streakBonus);
  });

  it('computeDailyRewardXp increases with streak but caps the bonus window', () => {
    const day1 = computeDailyRewardXp(1);
    const day7 = computeDailyRewardXp(7);
    const day30 = computeDailyRewardXp(30);
    expect(day7).toBeGreaterThan(day1);
    expect(day30).toBe(day7);
  });
});
