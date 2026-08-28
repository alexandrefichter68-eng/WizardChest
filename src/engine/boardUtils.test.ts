import { Chess } from 'chess.js';
import { assertSquareIsNotKing, findKingSquare, getMissingPieces, isEnemyKingAttacked } from '@/engine/boardUtils';

describe('boardUtils', () => {
  describe('getMissingPieces', () => {
    it('reports nothing missing from the starting position', () => {
      const chess = new Chess();
      expect(getMissingPieces(chess, 'w')).toEqual([]);
      expect(getMissingPieces(chess, 'b')).toEqual([]);
    });

    it('reports exactly the captured pieces after a few captures', () => {
      // White has lost a knight and two pawns; black has lost a bishop.
      const chess = new Chess('rnbqkbnr/pp1ppppp/8/2p5/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      // Manually strip pieces to simulate captures rather than playing them out.
      chess.remove('b1'); // white knight gone
      chess.remove('a2'); // white pawn gone
      chess.remove('b2'); // white pawn gone
      chess.remove('c8'); // black bishop gone
      expect(getMissingPieces(chess, 'w').sort()).toEqual(['n', 'p', 'p'].sort());
      expect(getMissingPieces(chess, 'b')).toEqual(['b']);
    });

    it('never reports the king as missing (kings are excluded entirely)', () => {
      const chess = new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
      expect(getMissingPieces(chess, 'w')).not.toContain('k');
      expect(getMissingPieces(chess, 'b')).not.toContain('k');
    });
  });

  describe('findKingSquare', () => {
    it('finds each side\'s king', () => {
      const chess = new Chess();
      expect(findKingSquare(chess, 'w')).toBe('e1');
      expect(findKingSquare(chess, 'b')).toBe('e8');
    });
  });

  describe('isEnemyKingAttacked', () => {
    it('detects "échec fantôme": the opponent king is attacked even though it is still the attacker\'s own turn', () => {
      // White queen on d4 attacks the black king on d8 along the d-file — it's still white's turn
      // (no move has been made), exactly the state a spell effect like Cataclysme/Corruption can
      // produce mid-turn.
      const chess = new Chess('3k4/8/8/8/3Q4/8/8/4K3 w - - 0 1');
      expect(isEnemyKingAttacked(chess, 'w')).toBe(true);
    });

    it('returns false when the opponent king is safe', () => {
      const chess = new Chess();
      expect(isEnemyKingAttacked(chess, 'w')).toBe(false);
    });
  });

  describe('assertSquareIsNotKing', () => {
    it('throws when the square holds a king', () => {
      const chess = new Chess();
      expect(() => assertSquareIsNotKing(chess, 'e1', 'test')).toThrow();
    });

    it('does not throw for a non-king square', () => {
      const chess = new Chess();
      expect(() => assertSquareIsNotKing(chess, 'e2', 'test')).not.toThrow();
    });
  });
});
