import { Chess, type Color as ChessColor, type Square } from 'chess.js';

export function findKingSquare(chess: Chess, color: ChessColor): Square | null {
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square;
    }
  }
  return null;
}

/**
 * True if moving `from` -> `to` (raw board mutation, no chess.js legality check) would NOT leave
 * the mover's own king in check. Used by spells that bend normal movement rules (leap, céleste)
 * but must still respect "never expose your own king".
 */
export function isDestinationSafeForOwnKing(chess: Chess, from: Square, to: Square, color: ChessColor): boolean {
  const probe = new Chess(chess.fen());
  const movingPiece = probe.get(from);
  if (!movingPiece) return false;
  probe.remove(from);
  probe.remove(to);
  probe.put({ type: movingPiece.type, color: movingPiece.color }, to);
  const kingSquare = findKingSquare(probe, color);
  if (!kingSquare) return true;
  const opponent: ChessColor = color === 'w' ? 'b' : 'w';
  return !probe.isAttacked(kingSquare, opponent);
}

/**
 * Hard safety net: a king must never be captured, converted, or otherwise removed by magic —
 * only checkmate ends the game. Every spell effect that mutates the board via chess.js's raw
 * `remove`/`put` API (bypassing normal move legality) must call this before touching a square
 * that might hold a king, so a bug upstream throws loudly instead of silently deleting a king.
 */
export function assertSquareIsNotKing(chess: Chess, square: Square, context: string): void {
  const piece = chess.get(square);
  if (piece?.type === 'k') {
    throw new Error(`[boardSafety] Refused to affect the king on ${square} via "${context}" — kings can never be captured or altered by magic.`);
  }
}

/**
 * "Échec fantôme" (dev-internal name only): after a spell mutates the board directly, the side
 * to move hasn't changed (casting a spell doesn't end the turn), so chess.js's own `inCheck()`
 * — which always reports on the side to move — cannot tell us whether the *opponent's* king is
 * newly exposed. This checks that directly via `isAttacked`, independent of whose turn it is.
 */
export function isEnemyKingAttacked(chess: Chess, attackerColor: ChessColor): boolean {
  const opponent: ChessColor = attackerColor === 'w' ? 'b' : 'w';
  const kingSquare = findKingSquare(chess, opponent);
  if (!kingSquare) return false;
  return chess.isAttacked(kingSquare, attackerColor);
}
