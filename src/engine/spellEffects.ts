import { Chess, type Square } from 'chess.js';

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

export function getAdjacentSquares(square: Square): Square[] {
  const [f, r] = toCoords(square);
  const result: Square[] = [];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const sq = toSquare(f + df, r + dr);
      if (sq) result.push(sq);
    }
  }
  return result;
}

export interface ExplosionResult {
  destroyedSquares: Square[];
}

/**
 * Destroys the targeted pawn plus every piece on the 8 adjacent squares — any color, but never
 * a king (magic can't win the game by itself; only checkmate can). Board is mutated directly via
 * chess.js's `remove()`, which keeps castling rights / setup consistent — the side to move is
 * untouched, since casting a spell doesn't end the turn.
 */
export function applyExplosion(chess: Chess, targetSquare: Square): ExplosionResult {
  const squaresToClear = [targetSquare, ...getAdjacentSquares(targetSquare)];
  const destroyedSquares: Square[] = [];
  for (const square of squaresToClear) {
    const piece = chess.get(square);
    if (piece && piece.type !== 'k') {
      chess.remove(square);
      destroyedSquares.push(square);
    }
  }
  return { destroyedSquares };
}

/** Swaps two allied pieces' positions directly on the board. Neither square may hold a king. */
export function applyTeleport(chess: Chess, squareA: Square, squareB: Square): void {
  const pieceA = chess.get(squareA);
  const pieceB = chess.get(squareB);
  if (!pieceA || !pieceB) throw new Error('applyTeleport: both squares must hold a piece');
  chess.remove(squareA);
  chess.remove(squareB);
  chess.put({ type: pieceA.type, color: pieceA.color }, squareB);
  chess.put({ type: pieceB.type, color: pieceB.color }, squareA);
}
