import { Chess, type Color as ChessColor, type PieceSymbol, type Square } from 'chess.js';

/** A standard chess set's starting composition per side, excluding the king. */
const STANDARD_COUNTS: Record<Exclude<PieceSymbol, 'k'>, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };

/**
 * Which of `color`'s own piece types are currently missing compared to a standard starting set —
 * i.e. what the opponent has captured (shown near the *opponent's* bar, chess.com-style).
 * Computed fresh from the live board rather than kept as a running log: this game's spells
 * (Cataclysme, Prix du Sang, Corruption, Résurrection…) remove, add, and recolor pieces through
 * several different code paths, and a diff against the current position is naturally correct
 * regardless of which path a piece disappeared through — no separate tracking to keep in sync.
 * Promotion/résurrection/corruption can shift the exact numbers (e.g. a promoted queen isn't
 * "captured" even though a pawn is now missing) — an accepted approximation, same trade-off
 * chess.com itself makes with promotions.
 */
export function getMissingPieces(chess: Chess, color: ChessColor): PieceSymbol[] {
  const counts: Record<Exclude<PieceSymbol, 'k'>, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.color === color && cell.type !== 'k') counts[cell.type] += 1;
    }
  }
  const missing: PieceSymbol[] = [];
  (Object.keys(STANDARD_COUNTS) as Exclude<PieceSymbol, 'k'>[]).forEach((type) => {
    for (let i = 0; i < STANDARD_COUNTS[type] - counts[type]; i++) missing.push(type);
  });
  return missing;
}

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
