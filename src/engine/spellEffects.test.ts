import { Chess } from 'chess.js';
import {
  applyCorruption,
  applyExplosion,
  applyTeleport,
  applyTeleportWithPromotion,
  getAdjacentSquares,
  getOrthogonalAdjacentSquares,
  getTeleportPromotionSquare,
  promoteEdgePawns,
} from '@/engine/spellEffects';

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
      const chess = new Chess('k7/8/8/8/8/R7/4P3/4K3 w - - 0 1');
      applyTeleport(chess, 'a3', 'e2');
      expect(chess.get('a3')).toEqual({ type: 'p', color: 'w' });
      expect(chess.get('e2')).toEqual({ type: 'r', color: 'w' });
    });

    it('auto-promotes to a queen when a pawn lands on the back rank (e.g. swapped with a rook sitting there)', () => {
      const chess = new Chess('k3R3/8/8/8/8/8/4P3/4K3 w - - 0 1');
      applyTeleport(chess, 'e2', 'e8');
      expect(chess.get('e8')).toEqual({ type: 'q', color: 'w' });
      expect(chess.get('e2')).toEqual({ type: 'r', color: 'w' });
      // The whole point of the fix: chess.js must still accept this position afterward.
      expect(() => new Chess(chess.fen())).not.toThrow();
    });

    it('does not change whose turn it is', () => {
      const chess = new Chess('k7/8/8/8/8/R7/4P3/4K3 w - - 0 1');
      applyTeleport(chess, 'a3', 'e2');
      expect(chess.turn()).toBe('w');
    });

    it('refuses to strand a pawn on its own back rank (no promotion equivalent, would be a free queen for nothing)', () => {
      const chess = new Chess('k7/8/8/8/8/8/4P3/R3K3 w - - 0 1');
      expect(() => applyTeleport(chess, 'a1', 'e2')).toThrow();
      // Nothing should have moved — the throw must happen before any mutation.
      expect(chess.get('a1')).toEqual({ type: 'r', color: 'w' });
      expect(chess.get('e2')).toEqual({ type: 'p', color: 'w' });
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

  describe('getTeleportPromotionSquare', () => {
    it('returns the landing square when a pawn would reach the enemy back rank', () => {
      const chess = new Chess('k3R3/8/8/8/8/8/4P3/4K3 w - - 0 1');
      expect(getTeleportPromotionSquare(chess, 'e2', 'e8')).toBe('e8');
      expect(getTeleportPromotionSquare(chess, 'e8', 'e2')).toBe('e8');
    });

    it('returns null when neither piece is a pawn reaching its promotion rank', () => {
      const chess = new Chess('k3R3/8/8/8/8/R7/4P3/4K3 w - - 0 1');
      expect(getTeleportPromotionSquare(chess, 'a3', 'e2')).toBeNull();
    });
  });

  describe('applyTeleportWithPromotion', () => {
    it("promotes the pawn to the chosen piece and moves the other piece into the pawn's old square", () => {
      const chess = new Chess('k3R3/8/8/8/8/8/4P3/4K3 w - - 0 1');
      applyTeleportWithPromotion(chess, 'e2', 'e8', 'n');
      expect(chess.get('e8')).toEqual({ type: 'n', color: 'w' });
      expect(chess.get('e2')).toEqual({ type: 'r', color: 'w' });
      expect(() => new Chess(chess.fen())).not.toThrow();
    });
  });

  describe('promoteEdgePawns', () => {
    it('turns a pawn sitting on rank 1 or 8 into a queen of the same color', () => {
      // A pawn can never legally sit on rank 1/8 — chess.js's own FEN parser rejects it, so the
      // only way to get one there for this test is the same way a spell does: chess.put() directly.
      const chess = new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
      chess.put({ type: 'p', color: 'w' }, 'a8');
      chess.put({ type: 'p', color: 'b' }, 'a1');
      promoteEdgePawns(chess, ['a8', 'a1']);
      expect(chess.get('a8')).toEqual({ type: 'q', color: 'w' });
      expect(chess.get('a1')).toEqual({ type: 'q', color: 'b' });
    });

    it('leaves non-pawn pieces and pawns off the edge rows untouched', () => {
      const chess = new Chess('4k3/8/8/4P3/8/8/8/4K3 w - - 0 1');
      promoteEdgePawns(chess, ['e8', 'e5']);
      expect(chess.get('e8')).toEqual({ type: 'k', color: 'b' });
      expect(chess.get('e5')).toEqual({ type: 'p', color: 'w' });
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
