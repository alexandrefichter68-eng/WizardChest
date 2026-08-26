import { Chess } from 'chess.js';
import { applyCelesteMove, getCelesteDestinations } from '@/engine/celesteMoves';

describe('celesteMoves', () => {
  it('offers straight-back and both diagonal-back destinations for a white piece', () => {
    // White rook on d4 (rank index 3): straight back is d2, diagonals back are b2/f2.
    const chess = new Chess('k7/8/8/8/3R4/8/8/7K w - - 0 1');
    const destinations = getCelesteDestinations(chess, 'd4').sort();
    expect(destinations).toEqual(['b2', 'd2', 'f2'].sort());
  });

  it('goes the other way for a black piece', () => {
    const chess = new Chess('7k/8/8/8/3r4/8/8/K7 b - - 0 1');
    const destinations = getCelesteDestinations(chess, 'd4').sort();
    expect(destinations).toEqual(['b6', 'd6', 'f6'].sort());
  });

  it('never lands on an occupied square (no captures)', () => {
    const chess = new Chess('k7/8/8/8/3R4/8/1P3P2/7K w - - 0 1');
    const destinations = getCelesteDestinations(chess, 'd4');
    expect(destinations).not.toContain('b2');
    expect(destinations).not.toContain('f2');
    expect(destinations).toContain('d2');
  });

  it('never available to the king', () => {
    const chess = new Chess();
    expect(getCelesteDestinations(chess, 'e1')).toEqual([]);
  });

  it('excludes destinations that would leave the mover\'s own king in check', () => {
    // White rook e2 is pinned along the e-file by the black rook on e8, against the white king
    // on e1 — jumping off the file would expose the king.
    const chess = new Chess('k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1');
    expect(getCelesteDestinations(chess, 'e2')).toEqual([]);
  });

  it('applyCelesteMove relocates the piece and flips the turn without capturing anything', () => {
    const chess = new Chess('k7/8/8/8/3R4/8/8/7K w - - 0 1');
    applyCelesteMove(chess, 'd4', 'd2');
    expect(chess.get('d4')).toBeUndefined();
    expect(chess.get('d2')).toEqual({ type: 'r', color: 'w' });
    expect(chess.turn()).toBe('b');
  });

  it('throws rather than landing on an occupied square', () => {
    const chess = new Chess('k7/8/8/8/3R4/8/3P4/7K w - - 0 1');
    expect(() => applyCelesteMove(chess, 'd4', 'd2')).toThrow();
  });
});
