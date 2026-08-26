import type { Chess, PieceSymbol } from 'chess.js';
import type { PlayStyle } from '@/types';

/** Classic centipawn material values. */
export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

/**
 * Standard piece-square tables (centipawns, from white's perspective, rank 8 first).
 * These are the well-known public-domain "simplified evaluation function" tables used across
 * countless open-source chess engines — not copied from any single proprietary engine.
 */
const PAWN_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const KNIGHT_TABLE = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_TABLE = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];

const QUEEN_TABLE = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];

const KING_MIDDLEGAME_TABLE = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];

const KING_ENDGAME_TABLE = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50,
];

const TABLES: Record<Exclude<PieceSymbol, 'k'>, number[]> = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
};

function mirrorIndex(index: number): number {
  const file = index % 8;
  const rank = Math.floor(index / 8);
  return (7 - rank) * 8 + file;
}

function isEndgame(chess: Chess): boolean {
  const board = chess.board();
  let queens = 0;
  let minorsAndRooks = 0;
  for (const row of board) {
    for (const square of row) {
      if (!square) continue;
      if (square.type === 'q') queens += 1;
      else if (square.type === 'r' || square.type === 'n' || square.type === 'b') minorsAndRooks += 1;
    }
  }
  return queens === 0 || minorsAndRooks <= 4;
}

/** Small per-style nudges so opponents feel different without changing legality or search logic. */
export interface StyleWeights {
  aggression: number; // rewards mobility/attacking pieces near the enemy king
  caution: number; // rewards king safety / pawn shelter
  centerControl: number; // rewards central pawn/piece presence
}

export function getStyleWeights(style: PlayStyle | null): StyleWeights {
  switch (style) {
    case 'agressif':
      return { aggression: 1.6, caution: 0.5, centerControl: 1 };
    case 'prudent':
      return { aggression: 0.5, caution: 1.7, centerControl: 0.9 };
    case 'tactique':
      return { aggression: 1.2, caution: 0.8, centerControl: 1.1 };
    case 'positionnel':
      return { aggression: 0.7, caution: 1, centerControl: 1.6 };
    case 'amateur':
      return { aggression: 0.9, caution: 0.8, centerControl: 0.8 };
    default:
      return { aggression: 1, caution: 1, centerControl: 1 };
  }
}

/**
 * Evaluates the position from the side-to-move's perspective (negamax convention): positive
 * means the side to move is better off.
 */
export function evaluatePosition(chess: Chess, style: PlayStyle | null = null): number {
  if (chess.isCheckmate()) return -100000;
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
    return 0;
  }

  const endgame = isEndgame(chess);
  const weights = getStyleWeights(style);
  const board = chess.board();
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r]?.[f];
      if (!cell) continue;
      const index = r * 8 + f;
      const pieceIndex = cell.color === 'w' ? index : mirrorIndex(index);
      let value = PIECE_VALUES[cell.type];
      if (cell.type === 'k') {
        value += endgame ? KING_ENDGAME_TABLE[pieceIndex]! : KING_MIDDLEGAME_TABLE[pieceIndex]!;
      } else {
        value += TABLES[cell.type]![pieceIndex]!;
        if (cell.type === 'p' && (f === 3 || f === 4) && (r === 3 || r === 4)) {
          value += 6 * weights.centerControl;
        }
      }
      score += cell.color === 'w' ? value : -value;
    }
  }

  // Mobility (expensive-ish but bounded: called once per leaf, not per node during quiescence).
  const sideToMove = chess.turn();
  const mobility = chess.moves().length;
  const mobilityScore = mobility * 2 * weights.aggression;
  score += sideToMove === 'w' ? mobilityScore : -mobilityScore;

  if (chess.inCheck()) {
    const inCheckColor = chess.turn();
    const penalty = 40 * weights.caution;
    score += inCheckColor === 'w' ? -penalty : penalty;
  }

  return chess.turn() === 'w' ? score : -score;
}
