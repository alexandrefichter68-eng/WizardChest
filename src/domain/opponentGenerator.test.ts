import { generateOpponentProfile, OpponentRotation } from '@/domain/opponentGenerator';

describe('opponentGenerator', () => {
  it('generates an opponent whose Elo is close to the player Elo', () => {
    const opponent = generateOpponentProfile(1200, 'seed-1');
    expect(opponent.elo).toBeGreaterThanOrEqual(1120);
    expect(opponent.elo).toBeLessThanOrEqual(1280);
  });

  it('never generates a rating below the floor', () => {
    const opponent = generateOpponentProfile(50, 'seed-low');
    expect(opponent.elo).toBeGreaterThanOrEqual(100);
  });

  it('assigns a division consistent with the generated Elo', () => {
    const opponent = generateOpponentProfile(2400, 'seed-high');
    expect(['diamant', 'maitre', 'grand_maitre', 'sorcier_supreme']).toContain(opponent.division);
  });

  it('keeps win rate within a plausible range', () => {
    for (let i = 0; i < 20; i++) {
      const opponent = generateOpponentProfile(1200, `seed-${i}`);
      expect(opponent.winRate).toBeGreaterThanOrEqual(0.3);
      expect(opponent.winRate).toBeLessThanOrEqual(0.8);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = generateOpponentProfile(1200, 'stable-seed');
    const b = generateOpponentProfile(1200, 'stable-seed');
    expect(a.username).toBe(b.username);
    expect(a.elo).toBe(b.elo);
  });

  it('OpponentRotation avoids immediately repeating the same username', () => {
    const rotation = new OpponentRotation();
    const seen: string[] = [];
    for (let i = 0; i < 10; i++) {
      const { opponent } = rotation.next(1200);
      seen.push(opponent.username);
    }
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).not.toBe(seen[i - 1]);
    }
  });
});
