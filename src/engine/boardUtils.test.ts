import { Chess } from 'chess.js';
import { assertSquareIsNotKing, findKingSquare, isEnemyKingAttacked } from '@/engine/boardUtils';

describe('boardUtils', () => {
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
