import { Chess } from 'chess.js';
import { applyCorruption, applyExplosion, applyTeleport, getAdjacentSquares, getOrthogonalAdjacentSquares } from '@/engine/spellEffects';

describe('spellEffects', () => {
  describe('getAdjacentSquares', () => {
    it('returns 8 neighbours for a central square', () => {
      expect(getAdjacentSquares('d4')).toHaveLength(8);
    });

    it('returns 3 neighbours for a corner square', () => {
      expect(getAdjacentSquares('a1').sort()).toEqual(['a2', 'b1', 'b2'].sort());
    });

    it('returns 5 neighbours for an edge square', () => {
      expect(getAdjacentSquares('a4')).toHaveLength(5);
    });
  });

  describe('applyExplosion', () => {
    it('destroys the target pawn and every adjacent piece, of either color', () => {
      // White pawn on d4 (target), black pawns adjacent on c5/e5, white knight adjacent on d5.
      const chess = new Chess('8/8/8/2pNp3/3P4/8/8/4K2k w - - 0 1');
      const result = applyExplosion(chess, 'd4');
      expect(result.destroyedSquares.sort()).toEqual(['c5', 'd4', 'd5', 'e5'].sort());
      expect(chess.get('d4')).toBeUndefined();
      expect(chess.get('c5')).toBeUndefined();
      expect(chess.get('d5')).toBeUndefined();
      expect(chess.get('e5')).toBeUndefined();
    });

    it('never destroys a king even if adjacent to the blast', () => {
      const chess = new Chess('8/8/3k4/3P4/8/8/8/4K3 w - - 0 1');
      applyExplosion(chess, 'd5');
      expect(chess.get('d6')).toEqual({ type: 'k', color: 'b' });
    });

    it('does not change whose turn it is', () => {
      const chess = new Chess('8/8/8/2pNp3/3P4/8/8/4K2k w - - 0 1');
      applyExplosion(chess, 'd4');
      expect(chess.turn()).toBe('w');
    });
  });

  describe('applyTeleport', () => {
    it('swaps two pieces\' positions', () => {
      const chess = new Chess('k7/8/8/8/8/8/4P3/R3K3 w - - 0 1');
      applyTeleport(chess, 'a1', 'e2');
      expect(chess.get('a1')).toEqual({ type: 'p', color: 'w' });
      expect(chess.get('e2')).toEqual({ type: 'r', color: 'w' });
    });

    it('does not change whose turn it is', () => {
      const chess = new Chess('k7/8/8/8/8/8/4P3/R3K3 w - - 0 1');
      applyTeleport(chess, 'a1', 'e2');
      expect(chess.turn()).toBe('w');
    });

    it('throws if either square is empty', () => {
      const chess = new Chess('k7/8/8/8/8/8/4P3/R3K3 w - - 0 1');
      expect(() => applyTeleport(chess, 'a1', 'b1')).toThrow();
    });

    it('refuses to move a king via teleport, in either slot', () => {
      const chess = new Chess('k7/8/8/8/8/8/4P3/R3K3 w - - 0 1');
      expect(() => applyTeleport(chess, 'e1', 'a1')).toThrow();
      expect(() => applyTeleport(chess, 'a1', 'e1')).toThrow();
      // Nothing should have moved — the throw must happen before any mutation.
      expect(chess.get('e1')).toEqual({ type: 'k', color: 'w' });
      expect(chess.get('a1')).toEqual({ type: 'r', color: 'w' });
    });
  });

  describe('getOrthogonalAdjacentSquares', () => {
    it('returns only the 4 horizontal/vertical neighbours, never diagonals', () => {
      expect(getOrthogonalAdjacentSquares('d4').sort()).toEqual(['c4', 'd3', 'd5', 'e4'].sort());
    });
  });

  describe('applyCorruption', () => {
    it('flips the targeted piece to the given color in place', () => {
      const chess = new Chess('k7/8/8/8/3p4/8/8/4K3 w - - 0 1');
      applyCorruption(chess, 'd4', 'w');
      expect(chess.get('d4')).toEqual({ type: 'p', color: 'w' });
    });

    it('does not change whose turn it is', () => {
      const chess = new Chess('k7/8/8/8/3p4/8/8/4K3 w - - 0 1');
      applyCorruption(chess, 'd4', 'w');
      expect(chess.turn()).toBe('w');
    });

    it('refuses to corrupt a king', () => {
      const chess = new Chess('k7/8/8/8/8/8/8/4K3 w - - 0 1');
      expect(() => applyCorruption(chess, 'a8', 'w')).toThrow();
    });

    it('throws if the target square is empty', () => {
      const chess = new Chess('k7/8/8/8/8/8/8/4K3 w - - 0 1');
      expect(() => applyCorruption(chess, 'd4', 'w')).toThrow();
    });
  });
});
