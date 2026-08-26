import { Chess, type Square } from 'chess.js';
import { assertSquareIsNotKing, isDestinationSafeForOwnKing } from '@/engine/boardUtils';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

function toCoords(square: Square): [number, number] {
  const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = parseInt(square[1]!, 10) - 1;
  return [file, rank];
}

function toSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${rank + 1}` as Square;
}

/**
 * Legal destinations for "Saut céleste": exactly 2 squares straight back or 2 squares diagonally
 * back (relative to the piece's own forward direction), ignoring blockers along the way like the
 * "Saut" spell, but landing only on an EMPTY square — it's an evasive retreat, not an attack, so
 * it never captures. Never available to the king, never leaves the mover's own king in check.
 */
export function getCelesteDestinations(chess: Chess, from: Square): Square[] {
  const piece = chess.get(from);
  if (!piece || piece.type === 'k') return [];
  const [f, r] = toCoords(from);
  const backDir = piece.color === 'w' ? -1 : 1;
  const candidates: Square[] = [];
  for (const df of [0, 2, -2]) {
    const sq = toSquare(f + df, r + 2 * backDir);
    if (sq && !chess.get(sq)) candidates.push(sq);
  }
  return candidates.filter((to) => isDestinationSafeForOwnKing(chess, from, to, piece.color));
}

/**
 * Applies a céleste jump directly (bypassing chess.js's move validation) and hands the turn to
 * the opponent, exactly as a normal move would. Never a capture, so no promotion handling needed
 * — a pawn landing on the back rank via céleste is impossible since it only ever moves backward.
 */
export function applyCelesteMove(chess: Chess, from: Square, to: Square): void {
  const piece = chess.get(from);
  if (!piece) throw new Error('applyCelesteMove: no piece at origin square');
  assertSquareIsNotKing(chess, to, 'celeste');
  if (chess.get(to)) throw new Error('applyCelesteMove: destination must be empty');

  chess.remove(from);
  chess.put({ type: piece.type, color: piece.color }, to);

  const parts = chess.fen().split(' ');
  const mover = piece.color;
  parts[1] = mover === 'w' ? 'b' : 'w';
  parts[3] = '-';
  parts[4] = String(Number(parts[4]) + 1);
  if (mover === 'b') parts[5] = String(Number(parts[5]) + 1);
  chess.load(parts.join(' '));
}
