import { difficultyFromOpponent, pickMoveWithSkillNoise } from '@/engine/difficulty';
import type { RootMoveScore } from '@/engine/search';
import type { Move } from 'chess.js';

function fakeMove(id: string): Move {
  return { from: id, to: id, piece: 'p', color: 'w', san: id, lan: id, before: '', after: '', flags: '' } as unknown as Move;
}

describe('difficulty', () => {
  it('difficultyFromOpponent scales time budget with depth, capped at 2800ms', () => {
    const shallow = difficultyFromOpponent(1, 0.5, 'amateur');
    const deep = difficultyFromOpponent(8, 0, 'tactique');
    expect(deep.timeBudgetMs).toBeGreaterThan(shallow.timeBudgetMs);
    expect(deep.timeBudgetMs).toBeLessThanOrEqual(2800);
  });

  it('pickMoveWithSkillNoise always returns the best move when skillNoise is 0', () => {
    const scores: RootMoveScore[] = [
      { move: fakeMove('best'), scoreCp: 100 },
      { move: fakeMove('worse'), scoreCp: 40 },
    ];
    for (let i = 0; i < 10; i++) {
      const chosen = pickMoveWithSkillNoise(scores, 0, `seed-${i}`);
      expect(chosen.from).toBe('best');
    }
  });

  it('pickMoveWithSkillNoise never picks a move far outside the noise window', () => {
    const scores: RootMoveScore[] = [
      { move: fakeMove('best'), scoreCp: 500 },
      { move: fakeMove('close'), scoreCp: 420 },
      { move: fakeMove('blunder'), scoreCp: -900 },
    ];
    for (let i = 0; i < 50; i++) {
      const chosen = pickMoveWithSkillNoise(scores, 1, `seed-${i}`);
      expect(chosen.from).not.toBe('blunder');
    }
  });

  it('pickMoveWithSkillNoise falls back to the best move when there is only one candidate', () => {
    const scores: RootMoveScore[] = [{ move: fakeMove('only'), scoreCp: 10 }];
    expect(pickMoveWithSkillNoise(scores, 1, 'seed').from).toBe('only');
  });

  it('pickMoveWithSkillNoise throws on an empty candidate list', () => {
    expect(() => pickMoveWithSkillNoise([], 0.5, 'seed')).toThrow();
  });
});
