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

const SLIDING_DIRECTIONS: Record<'b' | 'r' | 'q', [number, number][]> = {
  b: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
  r: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
  q: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
};

/**
 * Raw destinations for the "Saut" (Leap) spell: same movement shape as the piece normally has,
 * but blocking pieces along the way are ignored (jumped over). The final square still has to
 * follow normal rules (empty, or an enemy piece to capture — never a friendly piece, and never
 * either king: magic can bend movement, never win the game by removing a king directly).
 */
function rawLeapDestinations(chess: Chess, from: Square): Square[] {
  const piece = chess.get(from);
  if (!piece) return [];
  const [f, r] = toCoords(from);
  const destinations: Square[] = [];

  if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
    for (const [df, dr] of SLIDING_DIRECTIONS[piece.type]) {
      for (let dist = 1; dist <= 7; dist++) {
        const sq = toSquare(f + df * dist, r + dr * dist);
        if (!sq) break;
        const occupant = chess.get(sq);
        if (!occupant || (occupant.color !== piece.color && occupant.type !== 'k')) destinations.push(sq);
        // Whether or not this square is occupied, keep scanning past it — that's the jump.
      }
    }
  } else if (piece.type === 'p') {
    const dir = piece.color === 'w' ? 1 : -1;
    const startRank = piece.color === 'w' ? 1 : 6;
    const one = toSquare(f, r + dir);
    if (one && !chess.get(one)) destinations.push(one);
    if (r === startRank) {
      const two = toSquare(f, r + dir * 2);
      if (two && !chess.get(two)) destinations.push(two);
    }
    for (const df of [-1, 1]) {
      const diag = toSquare(f + df, r + dir);
      if (diag) {
        const occupant = chess.get(diag);
        if (occupant && occupant.color !== piece.color && occupant.type !== 'k') destinations.push(diag);
      }
    }
  } else {
    // Knight/king movement is already unaffected by blocking pieces, so leap adds nothing —
    // fall back to chess.js's own legal destinations for consistency. Filtered defensively so a
    // king square can never appear as a destination even in an anomalous ("échec fantôme")
    // position where chess.js's own legality check might otherwise allow it.
    return chess
      .moves({ square: from, verbose: true })
      .map((m) => m.to)
      .filter((to) => chess.get(to)?.type !== 'k');
  }

  return destinations;
}

/**
 * Legal leap destinations for the piece at `from`: same shape, blocking pieces ignored, but
 * still forbidden to land on a friendly piece, on either king, or to leave the mover's own king
 * in check — the leap spell bends the movement rule, never the "don't expose your own king" rule.
 */
export function getLeapDestinations(chess: Chess, from: Square): Square[] {
  const piece = chess.get(from);
  if (!piece || piece.type === 'k') return [];
  return rawLeapDestinations(chess, from).filter((to) => isDestinationSafeForOwnKing(chess, from, to, piece.color));
}

export interface LeapMoveResult {
  captured: boolean;
}

/**
 * Applies a leap move directly (bypassing chess.js's own move validation, since leap
 * intentionally ignores blocking pieces) and hands the turn to the opponent, exactly as a
 * normal move would. `promotion` is required when a pawn leaps onto the back rank.
 */
export function applyLeapMove(chess: Chess, from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): LeapMoveResult {
  const piece = chess.get(from);
  if (!piece) throw new Error('applyLeapMove: no piece at origin square');
  assertSquareIsNotKing(chess, to, 'leap');
  const capturedPiece = chess.get(to);

  chess.remove(from);
  chess.remove(to);
  chess.put({ type: promotion ?? piece.type, color: piece.color }, to);

  const parts = chess.fen().split(' ');
  const mover = piece.color;
  parts[1] = mover === 'w' ? 'b' : 'w';
  parts[3] = '-'; // Leap never creates an en passant target (documented simplification).
  const isCapture = Boolean(capturedPiece);
  const isPawnMove = piece.type === 'p';
  parts[4] = isCapture || isPawnMove ? '0' : String(Number(parts[4]) + 1);
  if (mover === 'b') parts[5] = String(Number(parts[5]) + 1);
  chess.load(parts.join(' '));

  return { captured: Boolean(capturedPiece) };
}
