import { Chess } from 'chess.js';
import { applyLeapMove, getLeapDestinations } from '@/engine/leapMoves';

describe('leapMoves', () => {
  it('lets a blocked bishop jump over pieces to reach a square beyond them', () => {
    // White bishop on a1, black pawns on b2 and c3 blocking the diagonal, d4 is empty beyond them.
    const chess = new Chess('k7/8/8/8/8/2p5/1p6/B6K w - - 0 1');
    const destinations = getLeapDestinations(chess, 'a1');
    expect(destinations).toContain('d4');
    // Chess.js's normal moves would NOT include d4 (blocked) — sanity check the test setup.
    expect(chess.moves({ square: 'a1', verbose: true }).map((m) => m.to)).not.toContain('d4');
  });

  it('can capture an enemy piece it jumped past, by landing exactly on it', () => {
    const chess = new Chess('k7/8/8/8/3p4/2p5/1p6/B6K w - - 0 1');
    const destinations = getLeapDestinations(chess, 'a1');
    expect(destinations).toContain('d4');
  });

  it('never lands on a friendly piece', () => {
    // d4 sits on the a1-h8 diagonal and is occupied by a friendly pawn.
    const chess = new Chess('k7/8/8/8/3P4/8/8/B6K w - - 0 1');
    const destinations = getLeapDestinations(chess, 'a1');
    expect(destinations).not.toContain('d4');
    // But leap still reaches past it, since it's not blocking anymore.
    expect(destinations).toContain('e5');
  });

  it('excludes every destination that would leave the mover\'s own king in check (pinned piece)', () => {
    // White bishop e2 is pinned along the e-file by the black rook on e8, against the white king
    // on e1. A bishop only moves diagonally, so no leap destination can keep the file blocked or
    // capture the rook — every destination must be filtered out.
    const chess = new Chess('k3r3/8/8/8/8/8/4B3/4K3 w - - 0 1');
    expect(getLeapDestinations(chess, 'e2')).toEqual([]);
  });

  it('never allows targeting the king (empty destinations)', () => {
    const chess = new Chess();
    expect(getLeapDestinations(chess, 'e1')).toEqual([]);
  });

  it('lets a pawn leap over a blocking piece for its two-square opening push, but not onto an occupied square', () => {
    const chess = new Chess('k7/8/8/8/8/3p4/3P4/7K w - - 0 1');
    const destinations = getLeapDestinations(chess, 'd2');
    // d3 is occupied (blocked one-square push stays illegal), but the two-square push to d4
    // ignores that blocker and lands on the empty square beyond it.
    expect(destinations).not.toContain('d3');
    expect(destinations).toContain('d4');
  });

  it('applyLeapMove relocates the piece, removes any captured piece, and flips the turn', () => {
    const chess = new Chess('k7/8/8/8/8/2p5/1p6/B6K w - - 0 1');
    const before = chess.fen();
    const result = applyLeapMove(chess, 'a1', 'd4');
    expect(result.captured).toBe(false);
    expect(chess.get('a1')).toBeUndefined();
    expect(chess.get('d4')?.type).toBe('b');
    expect(chess.get('d4')?.color).toBe('w');
    expect(chess.turn()).toBe('b');
    expect(chess.fen()).not.toBe(before);
  });

  it('applyLeapMove promotes a leaping pawn that lands on the back rank', () => {
    const chess = new Chess('k7/2P5/8/8/8/8/7p/7K w - - 0 1');
    applyLeapMove(chess, 'c7', 'c8', 'q');
    expect(chess.get('c8')).toEqual({ type: 'q', color: 'w' });
  });

  it('applyLeapMove keeps the resulting position fully legal for chess.js (no throw on further moves)', () => {
    const chess = new Chess('k7/8/8/8/8/2p5/1p6/B6K w - - 0 1');
    applyLeapMove(chess, 'a1', 'd4');
    expect(() => chess.moves({ verbose: true })).not.toThrow();
  });
});
