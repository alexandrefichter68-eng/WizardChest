import { useProfileStore } from '@/store/profileStore';
import { STARTING_ELO } from '@/domain/elo';

describe('profileStore', () => {
  beforeEach(() => {
    useProfileStore.getState().resetProgress();
  });

  it('starts a new profile at the configured starting Elo', () => {
    expect(useProfileStore.getState().profile.elo).toBe(STARTING_ELO);
    expect(useProfileStore.getState().profile.gamesPlayed).toBe(0);
  });

  it('setUsername trims and caps the length, and regenerates the avatar seed', () => {
    useProfileStore.getState().setUsername('  A Very Long Wizard Name That Exceeds The Limit  ');
    const { username, avatar } = useProfileStore.getState().profile;
    expect(username.length).toBeLessThanOrEqual(24);
    expect(username.startsWith(' ')).toBe(false);
    expect(avatar.seed).toBe(username);
  });

  it('setUsername ignores an empty/whitespace-only value', () => {
    const before = useProfileStore.getState().profile.username;
    useProfileStore.getState().setUsername('   ');
    expect(useProfileStore.getState().profile.username).toBe(before);
  });

  it('applyGameResult raises Elo, XP and win streak on a win', () => {
    const before = useProfileStore.getState().profile;
    const outcome = useProfileStore.getState().applyGameResult({ result: 'win', opponentElo: before.elo + 50, xpGained: 30 });
    const after = useProfileStore.getState().profile;

    expect(outcome.eloAfter).toBeGreaterThan(outcome.eloBefore);
    expect(after.elo).toBe(outcome.eloAfter);
    expect(after.xp).toBe(before.xp + 30);
    expect(after.winStreak).toBe(1);
    expect(after.wins).toBe(before.wins + 1);
    expect(after.gamesPlayed).toBe(before.gamesPlayed + 1);
  });

  it('applyGameResult resets the win streak on a loss', () => {
    useProfileStore.getState().applyGameResult({ result: 'win', opponentElo: STARTING_ELO, xpGained: 10 });
    expect(useProfileStore.getState().profile.winStreak).toBe(1);

    useProfileStore.getState().applyGameResult({ result: 'loss', opponentElo: STARTING_ELO, xpGained: 5 });
    expect(useProfileStore.getState().profile.winStreak).toBe(0);
    expect(useProfileStore.getState().profile.losses).toBe(1);
  });

  it('applyGameResult tracks the best win streak even after it ends', () => {
    for (let i = 0; i < 3; i++) {
      useProfileStore.getState().applyGameResult({ result: 'win', opponentElo: STARTING_ELO, xpGained: 10 });
    }
    useProfileStore.getState().applyGameResult({ result: 'loss', opponentElo: STARTING_ELO, xpGained: 5 });
    expect(useProfileStore.getState().profile.winStreak).toBe(0);
    expect(useProfileStore.getState().profile.bestWinStreak).toBe(3);
  });

  it('claimDailyReward grants XP once, then refuses a second claim the same day', () => {
    const first = useProfileStore.getState().claimDailyReward();
    expect(first).not.toBeNull();
    expect(useProfileStore.getState().profile.xp).toBe(first!.xpGained);

    const second = useProfileStore.getState().claimDailyReward();
    expect(second).toBeNull();
  });

  it('resetProgress restores a fresh profile at the starting Elo', () => {
    useProfileStore.getState().applyGameResult({ result: 'win', opponentElo: STARTING_ELO, xpGained: 500 });
    expect(useProfileStore.getState().profile.elo).not.toBe(STARTING_ELO);

    useProfileStore.getState().resetProgress();
    expect(useProfileStore.getState().profile.elo).toBe(STARTING_ELO);
    expect(useProfileStore.getState().profile.xp).toBe(0);
  });
});
