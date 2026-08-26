import { applyEloDelta, computeEloDelta, expectedScore, getKFactor, MIN_ELO } from '@/domain/elo';

describe('elo', () => {
  it('expectedScore is 0.5 for equal ratings', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 5);
  });

  it('expectedScore favors the higher-rated player', () => {
    expect(expectedScore(1600, 1200)).toBeGreaterThan(0.5);
    expect(expectedScore(1200, 1600)).toBeLessThan(0.5);
  });

  it('awards positive delta for an upset win against a stronger opponent', () => {
    const delta = computeEloDelta(1200, 1400, 1, 50);
    expect(delta).toBeGreaterThan(0);
  });

  it('awards negative delta for a loss against a weaker opponent', () => {
    const delta = computeEloDelta(1400, 1200, 0, 50);
    expect(delta).toBeLessThan(0);
  });

  it('a draw between equal ratings produces a near-zero delta', () => {
    const delta = computeEloDelta(1200, 1200, 0.5, 50);
    expect(delta).toBe(0);
  });

  it('new players (fewer than 20 games) get a higher K-factor', () => {
    expect(getKFactor(1200, 5)).toBeGreaterThan(getKFactor(1200, 100));
  });

  it('applyEloDelta never drops the rating below the floor', () => {
    expect(applyEloDelta(MIN_ELO + 5, -50)).toBe(MIN_ELO);
  });

  it('applyEloDelta adds the delta when above the floor', () => {
    expect(applyEloDelta(1200, 24)).toBe(1224);
  });
});
