import {
  buildRankedEntries,
  driftLeaderboard,
  findPlayerRank,
  generateLeaderboardPool,
} from '@/domain/leaderboard';
import type { PlayerProfile } from '@/types';

function makePlayer(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    id: 'player-1',
    username: 'TestWizard',
    avatar: { seed: 'TestWizard', initials: 'TW', hue: 200, variant: 0 },
    countryCode: 'FR',
    elo: 1200,
    division: 'argent',
    xp: 0,
    level: 1,
    winStreak: 0,
    bestWinStreak: 0,
    gamesPlayed: 10,
    wins: 5,
    losses: 4,
    draws: 1,
    createdAt: Date.now(),
    lastDailyRewardAt: null,
    dailyRewardStreak: 0,
    unlockedBoardThemes: ['pierre_ivoire'],
    unlockedPieceThemes: ['classique'],
    activeBoardTheme: 'pierre_ivoire',
    activePieceTheme: 'classique',
    ...overrides,
  };
}

describe('leaderboard', () => {
  it('generates exactly 100 bots', () => {
    const bots = generateLeaderboardPool(1200, 'seed-a');
    expect(bots).toHaveLength(100);
  });

  it('is deterministic for a given seed', () => {
    const first = generateLeaderboardPool(1200, 'same-seed');
    const second = generateLeaderboardPool(1200, 'same-seed');
    expect(first.map((b) => b.username)).toEqual(second.map((b) => b.username));
    expect(first.map((b) => b.elo)).toEqual(second.map((b) => b.elo));
  });

  it('produces unique bot ids', () => {
    const bots = generateLeaderboardPool(1200, 'unique-check');
    const ids = new Set(bots.map((b) => b.id));
    expect(ids.size).toBe(bots.length);
  });

  it('drift keeps every bot within its anchor window (no absurd jumps)', () => {
    const bots = generateLeaderboardPool(1200, 'drift-seed');
    let current = bots;
    for (let day = 0; day < 30; day++) {
      current = driftLeaderboard(current, `day-${day}`);
    }
    current.forEach((bot, i) => {
      expect(Math.abs(bot.elo - bots[i]!.anchorElo)).toBeLessThanOrEqual(150);
    });
  });

  it('inserts the player into the ranked global list and finds their rank', () => {
    const bots = generateLeaderboardPool(1200, 'rank-seed');
    const player = makePlayer({ elo: 999999 }); // guarantee first place
    const entries = buildRankedEntries(bots, player, 'global');
    expect(entries).toHaveLength(bots.length + 1);
    expect(findPlayerRank(entries, player.id)).toBe(1);
  });

  it('the division scope only includes entries from the player\'s division', () => {
    const bots = generateLeaderboardPool(1200, 'division-seed');
    const player = makePlayer({ division: 'or' });
    const entries = buildRankedEntries(bots, player, 'division');
    expect(entries.every((e) => e.division === 'or')).toBe(true);
    expect(entries.some((e) => e.isPlayer)).toBe(true);
  });

  it('the global ranking is sorted by descending Elo', () => {
    const bots = generateLeaderboardPool(1200, 'sort-seed');
    const player = makePlayer();
    const entries = buildRankedEntries(bots, player, 'global');
    for (let i = 0; i < entries.length - 1; i++) {
      expect(entries[i]!.elo).toBeGreaterThanOrEqual(entries[i + 1]!.elo);
    }
  });
});
