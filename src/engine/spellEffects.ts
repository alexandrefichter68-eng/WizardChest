import { Chess, type Square } from 'chess.js';
import { assertSquareIsNotKing } from '@/engine/boardUtils';

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

/** The blast radius of a "Cataclysme" cast on `targetSquare` — the target plus its 8 neighbors. */
export function getBlastSquares(targetSquare: Square): Square[] {
  return [targetSquare, ...getAdjacentSquares(targetSquare)];
}

/** The 4 orthogonal neighbors of a square (used by "Corruption", which is linear-only, no diagonals). */
export function getOrthogonalAdjacentSquares(square: Square): Square[] {
  const [f, r] = toCoords(square);
  const result: Square[] = [];
  for (const [df, dr] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const sq = toSquare(f + df!, r + dr!);
    if (sq) result.push(sq);
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
  const squaresToClear = getBlastSquares(targetSquare);
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

/**
 * Auto-promotes to a queen any pawn left sitting on the back rank (rank 1 or 8) — spells that
 * place a piece directly on the board (Téléportation, Résurrection) bypass chess.js's own
 * promotion handling entirely, and a raw pawn on the edge rows makes the position's FEN invalid
 * (chess.js refuses to re-parse it, crashing the very next read of `chess.fen()`).
 */
export function promoteEdgePawns(chess: Chess, squares: Square[]): void {
  for (const square of squares) {
    const piece = chess.get(square);
    if (piece && piece.type === 'p' && (square[1] === '1' || square[1] === '8')) {
      chess.remove(square);
      chess.put({ type: 'q', color: piece.color }, square);
    }
  }
}

/** Swaps two allied pieces' positions directly on the board. Neither square may hold a king. */
export function applyTeleport(chess: Chess, squareA: Square, squareB: Square): void {
  assertSquareIsNotKing(chess, squareA, 'teleport');
  assertSquareIsNotKing(chess, squareB, 'teleport');
  const pieceA = chess.get(squareA);
  const pieceB = chess.get(squareB);
  if (!pieceA || !pieceB) throw new Error('applyTeleport: both squares must hold a piece');
  chess.remove(squareA);
  chess.remove(squareB);
  chess.put({ type: pieceA.type, color: pieceA.color }, squareB);
  chess.put({ type: pieceB.type, color: pieceB.color }, squareA);
  promoteEdgePawns(chess, [squareA, squareB]);
}

/**
 * "Corruption": the targeted enemy piece switches sides and becomes an allied piece. Never a
 * king — magic can bend the board, never take direct control of a king. No turn pass; like
 * Cataclysme/Téléportation, this is a mid-turn effect the caster's own move follows afterward.
 */
export function applyCorruption(chess: Chess, targetSquare: Square, newColor: 'w' | 'b'): void {
  assertSquareIsNotKing(chess, targetSquare, 'corruption');
  const piece = chess.get(targetSquare);
  if (!piece) throw new Error('applyCorruption: target square must hold a piece');
  chess.remove(targetSquare);
  chess.put({ type: piece.type, color: newColor }, targetSquare);
}
