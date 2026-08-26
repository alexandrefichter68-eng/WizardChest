import {
  DIVISIONS,
  getDivisionById,
  getDivisionForElo,
  getDivisionProgress,
  getNextDivision,
} from '@/domain/divisions';

describe('divisions', () => {
  it('covers the full Elo range with no gaps', () => {
    const sorted = [...DIVISIONS].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i]!;
      const next = sorted[i + 1]!;
      expect(current.maxElo).not.toBeNull();
      expect(next.minElo).toBe(current.maxElo! + 1);
    }
  });

  it('the lowest division starts at 0 and the highest has no ceiling', () => {
    const sorted = [...DIVISIONS].sort((a, b) => a.order - b.order);
    expect(sorted[0]!.minElo).toBe(0);
    expect(sorted[sorted.length - 1]!.maxElo).toBeNull();
  });

  it('getDivisionForElo returns Bois for a starting player', () => {
    expect(getDivisionForElo(800).id).toBe('bois');
  });

  it('getDivisionForElo returns Sorcier Suprême for very high ratings', () => {
    expect(getDivisionForElo(2600).id).toBe('sorcier_supreme');
  });

  it('getDivisionForElo is monotonic: higher elo never yields a lower division', () => {
    for (let elo = 0; elo < 3000; elo += 137) {
      const division = getDivisionForElo(elo);
      const higherDivision = getDivisionForElo(elo + 137);
      expect(higherDivision.order).toBeGreaterThanOrEqual(division.order);
    }
  });

  it('getDivisionById throws for an unknown id', () => {
    // @ts-expect-error intentional invalid id for the failure-path test
    expect(() => getDivisionById('not_a_division')).toThrow();
  });

  it('getDivisionProgress is 0 at the bottom of a division and rises toward 1 near the top', () => {
    const bronze = getDivisionById('bronze');
    expect(getDivisionProgress(bronze.minElo)).toBeCloseTo(0, 1);
    expect(getDivisionProgress(bronze.maxElo! )).toBeGreaterThan(0.9);
  });

  it('getNextDivision returns null after the last division', () => {
    const last = DIVISIONS[DIVISIONS.length - 1]!;
    expect(getNextDivision(last)).toBeNull();
  });

  it('getNextDivision returns the following division in order', () => {
    const bois = getDivisionById('bois');
    expect(getNextDivision(bois)?.id).toBe('bronze');
  });

  it('AI difficulty (depth/noise) increases monotonically with division order', () => {
    const sorted = [...DIVISIONS].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i + 1]!.aiDepth).toBeGreaterThanOrEqual(sorted[i]!.aiDepth);
      expect(sorted[i + 1]!.aiSkillNoise).toBeLessThanOrEqual(sorted[i]!.aiSkillNoise);
    }
  });
});
