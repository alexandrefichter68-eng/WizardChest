import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { assertSquareIsNotKing } from '@/engine/boardUtils';
import type { PieceColor } from '@/types';

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

/**
 * True if swapping the pieces on these two squares would leave a pawn sitting on its own
 * non-promoting back rank (rank 1 for white, rank 8 for black). Landing on the *opponent's* back
 * rank is a legitimate promotion (see `promoteEdgePawns`), but a pawn stranded on its own home
 * rank has no equivalent in real chess and would otherwise hand out a free queen for nothing —
 * that swap is rejected outright instead.
 */
export function wouldTeleportStrandPawn(chess: Chess, squareA: Square, squareB: Square): boolean {
  const strandsOwnBackRank = (piece: { type: PieceSymbol; color: 'w' | 'b' } | undefined, destSquare: Square) =>
    piece?.type === 'p' && destSquare[1] === (piece.color === 'w' ? '1' : '8');
  return strandsOwnBackRank(chess.get(squareA), squareB) || strandsOwnBackRank(chess.get(squareB), squareA);
}

/**
 * If swapping the pieces on these two squares would land a pawn on the *opponent's* back rank —
 * a legitimate promotion, same as reaching it by a normal move — returns the square the pawn
 * ends up on so the caller can show the promotion picker before applying the swap. Returns null
 * when no promotion is involved.
 */
export function getTeleportPromotionSquare(chess: Chess, squareA: Square, squareB: Square): Square | null {
  const promotesOnLanding = (piece: { type: PieceSymbol; color: 'w' | 'b' } | undefined, destSquare: Square) =>
    piece?.type === 'p' && destSquare[1] === (piece.color === 'w' ? '8' : '1');
  if (promotesOnLanding(chess.get(squareA), squareB)) return squareB;
  if (promotesOnLanding(chess.get(squareB), squareA)) return squareA;
  return null;
}

/**
 * Completes a Téléportation swap where the pawn landing on `promotionSquare` becomes the given
 * `promotionPiece` — chosen by the player via the promotion modal — instead of always auto-
 * queening (which `applyTeleport`'s own safety net does when nobody asked for a choice).
 */
export function applyTeleportWithPromotion(
  chess: Chess,
  pawnSquare: Square,
  promotionSquare: Square,
  promotionPiece: 'q' | 'r' | 'b' | 'n',
): void {
  const pawn = chess.get(pawnSquare);
  const other = chess.get(promotionSquare);
  if (!pawn || pawn.type !== 'p' || !other) {
    throw new Error('applyTeleportWithPromotion: invalid squares for a teleport promotion');
  }
  chess.remove(pawnSquare);
  chess.remove(promotionSquare);
  chess.put({ type: promotionPiece, color: pawn.color }, promotionSquare);
  chess.put({ type: other.type, color: other.color }, pawnSquare);
}

/** Swaps two allied pieces' positions directly on the board. Neither square may hold a king. */
export function applyTeleport(chess: Chess, squareA: Square, squareB: Square): void {
  assertSquareIsNotKing(chess, squareA, 'teleport');
  assertSquareIsNotKing(chess, squareB, 'teleport');
  const pieceA = chess.get(squareA);
  const pieceB = chess.get(squareB);
  if (!pieceA || !pieceB) throw new Error('applyTeleport: both squares must hold a piece');
  if (wouldTeleportStrandPawn(chess, squareA, squareB)) {
    throw new Error('applyTeleport: cannot strand a pawn on its own back rank');
  }
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

/**
 * "Écho du Passé": moves the targeted piece (allied or enemy) back onto the square it occupied
 * before its last tracked move. `to` must currently be empty — callers only ever offer squares
 * with a known, presently-vacant previous position as valid targets. Never a king. Mid-turn
 * effect, like corruption/explosion: doesn't pass the turn.
 */
export function applyEchoOfThePast(chess: Chess, from: Square, to: Square): void {
  assertSquareIsNotKing(chess, from, 'echo_du_passe');
  const piece = chess.get(from);
  if (!piece) throw new Error('applyEchoOfThePast: source square must hold a piece');
  if (chess.get(to)) throw new Error('applyEchoOfThePast: destination square must be empty');
  chess.remove(from);
  chess.put({ type: piece.type, color: piece.color }, to);
  promoteEdgePawns(chess, [to]);
}

/**
 * True if `a` and `b` share a rank, file, or diagonal with no piece occupying any square strictly
 * between them (a rook/bishop-style clear line of sight). Used by Liaison Funeste — the two bound
 * pieces don't need to be able to *move* to each other, just see each other.
 */
export function hasLineOfSight(chess: Chess, a: Square, b: Square): boolean {
  const [fileA, rankA] = toCoords(a);
  const [fileB, rankB] = toCoords(b);
  const df = fileB - fileA;
  const dr = rankB - rankA;
  if (df === 0 && dr === 0) return false;
  if (df !== 0 && dr !== 0 && Math.abs(df) !== Math.abs(dr)) return false;
  const stepFile = Math.sign(df);
  const stepRank = Math.sign(dr);
  const steps = Math.max(Math.abs(df), Math.abs(dr));
  for (let i = 1; i < steps; i++) {
    const sq = toSquare(fileA + stepFile * i, rankA + stepRank * i);
    if (sq && chess.get(sq)) return false;
  }
  return true;
}

export interface DestructionReactionState {
  /** Piège Invisible: several can be active at once — the first piece (any color) to land on any
   * of these squares is destroyed. */
  trapSquares: Square[];
  /** Chasseur de Prime: if the marked piece dies, `bountyMarkedByColor` steals all enemy gold. */
  bountyMarkedSquare: Square | null;
  bountyMarkedByColor: PieceColor | null;
  /** Liaison Funeste: if either square's piece dies, the other's piece dies too. */
  boundPair: [Square, Square] | null;
}

export interface DestructionReactionResult {
  goldStolenBy: PieceColor | null;
  /** Additional squares destroyed as a reaction (e.g. a Liaison Funeste partner) — the caller must
   * remove these pieces from the board too, on top of whatever it already destroyed. */
  extraDestroyedSquares: Square[];
  /** Which of `trapSquares` were consumed by this call — the caller removes exactly these, leaving
   * any other still-armed traps in place. */
  consumedTrapSquares: Square[];
  bountyConsumed: boolean;
  boundPairConsumed: boolean;
}

/**
 * Given the squares just cleared of a piece (by any means — Cataclysme, a normal capture, Prix du
 * Sang, a Piège Invisible trigger…), works out which of the cross-spell "reacts to a death"
 * mechanisms fire, including chains (e.g. a Liaison Funeste death lands on a trap square too).
 * Pure and side-effect-free: the caller applies `extraDestroyedSquares`/`goldStolenBy` to its own
 * board/gold state.
 */
export function resolveDestructionReactions(
  destroyedSquares: Square[],
  state: DestructionReactionState,
): DestructionReactionResult {
  const result: DestructionReactionResult = {
    goldStolenBy: null,
    extraDestroyedSquares: [],
    consumedTrapSquares: [],
    bountyConsumed: false,
    boundPairConsumed: false,
  };
  const seen = new Set<Square>(destroyedSquares);
  const queue = [...destroyedSquares];
  let boundPair = state.boundPair;

  while (queue.length > 0) {
    const square = queue.shift()!;
    if (state.trapSquares.includes(square) && !result.consumedTrapSquares.includes(square)) {
      result.consumedTrapSquares.push(square);
    }
    if (state.bountyMarkedSquare === square && state.bountyMarkedByColor) {
      result.bountyConsumed = true;
      result.goldStolenBy = state.bountyMarkedByColor;
    }
    if (boundPair && (boundPair[0] === square || boundPair[1] === square)) {
      const other = boundPair[0] === square ? boundPair[1] : boundPair[0];
      result.boundPairConsumed = true;
      boundPair = null; // consumed once — a further chain reaction can't re-trigger it
      if (!seen.has(other)) {
        seen.add(other);
        result.extraDestroyedSquares.push(other);
        queue.push(other);
      }
    }
  }
  return result;
}
