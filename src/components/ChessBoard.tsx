import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { BoardThemeDef, PieceThemeDef } from '@/domain/cosmetics';
import { palette } from '@/theme/colors';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

const PIECE_GLYPHS: Record<PieceSymbol, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
};

/**
 * Pieces always get a soft contrast glow (a symmetric blur, not just a themed magic glow) so a
 * piece never blends into a same-toned square — e.g. black pieces on dark squares. The themed
 * glow (runique/spectral) takes priority when set; otherwise falls back to a light halo behind
 * dark pieces and a dark halo behind light pieces.
 */
function getPieceGlowColor(pieceColor: 'w' | 'b', themeGlow: string): string {
  if (themeGlow !== 'transparent') return themeGlow;
  return pieceColor === 'w' ? 'rgba(11,10,20,0.6)' : 'rgba(246,241,228,0.65)';
}

interface BoardPiece {
  square: Square;
  type: PieceSymbol;
  color: 'w' | 'b';
}

function readPieces(fen: string): BoardPiece[] {
  try {
    const chess = new Chess(fen);
    const pieces: BoardPiece[] = [];
    chess.board().forEach((row) => {
      row.forEach((cell) => {
        if (cell) pieces.push({ square: cell.square, type: cell.type, color: cell.color });
      });
    });
    return pieces;
  } catch {
    return [];
  }
}

function displayToSquare(row: number, col: number, orientation: 'white' | 'black'): Square {
  const file = orientation === 'white' ? col : 7 - col;
  const rank = orientation === 'white' ? 7 - row : row;
  return `${FILES[file]}${rank + 1}` as Square;
}

function squareToDisplay(square: Square, orientation: 'white' | 'black'): { row: number; col: number } {
  const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = parseInt(square[1]!, 10) - 1;
  const col = orientation === 'white' ? file : 7 - file;
  const row = orientation === 'white' ? 7 - rank : rank;
  return { row, col };
}

interface ChessBoardProps {
  fen: string;
  orientation: 'white' | 'black';
  size: number;
  boardTheme: BoardThemeDef;
  pieceTheme: PieceThemeDef;
  selectedSquare: Square | null;
  legalTargets: Square[];
  lastMove: { from: Square; to: Square } | null;
  checkSquare: Square | null;
  /** Squares about to be destroyed by Cataclysme — flashed in warning color before they vanish. */
  dangerSquares?: Square[];
  /** "Piège Invisible" squares (several can be active at once), shown translucent — only ever
   * passed for the caster's own view. */
  trapSquares?: Square[];
  /** "Camouflage" (online PvP only): renders whatever piece sits on these squares as a pawn,
   * regardless of its real type — purely visual, never passed to the disguised side's own view. */
  disguisedSquares?: Square[];
  interactive: boolean;
  onSquareTap: (square: Square) => void;
  onPieceDrop: (from: Square, to: Square) => void;
}

const TAP_DISTANCE_THRESHOLD = 10;

export function ChessBoard({
  fen,
  orientation,
  size,
  boardTheme,
  pieceTheme,
  selectedSquare,
  legalTargets,
  lastMove,
  checkSquare,
  dangerSquares,
  trapSquares,
  disguisedSquares,
  interactive,
  onSquareTap,
  onPieceDrop,
}: ChessBoardProps) {
  const squareSize = size / 8;
  const pieces = useMemo(() => readPieces(fen), [fen]);
  const trapSquaresSet = useMemo(() => new Set(trapSquares ?? []), [trapSquares]);
  const disguisedSquaresSet = useMemo(() => new Set(disguisedSquares ?? []), [disguisedSquares]);
  const legalTargetsSet = useMemo(() => new Set(legalTargets), [legalTargets]);
  const dangerSquaresSet = useMemo(() => new Set(dangerSquares ?? []), [dangerSquares]);

  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragOriginX = useSharedValue(0);
  const dragOriginY = useSharedValue(0);

  const draggedPiece = draggedSquare ? pieces.find((p) => p.square === draggedSquare) ?? null : null;

  const handleGestureEnd = (startSquare: Square, endX: number, endY: number, isTap: boolean) => {
    if (isTap) {
      onSquareTap(startSquare);
    } else {
      const col = Math.min(7, Math.max(0, Math.floor(endX / squareSize)));
      const row = Math.min(7, Math.max(0, Math.floor(endY / squareSize)));
      const target = displayToSquare(row, col, orientation);
      if (target === startSquare) {
        onSquareTap(startSquare);
      } else {
        onPieceDrop(startSquare, target);
      }
    }
    setDraggedSquare(null);
  };

  const panGesture = Gesture.Pan()
    .enabled(interactive)
    .minDistance(0)
    .onBegin((event) => {
      const col = Math.min(7, Math.max(0, Math.floor(event.x / squareSize)));
      const row = Math.min(7, Math.max(0, Math.floor(event.y / squareSize)));
      const square = displayToSquare(row, col, orientation);
      dragOriginX.value = col * squareSize;
      dragOriginY.value = row * squareSize;
      dragX.value = 0;
      dragY.value = 0;
      runOnJS(setDraggedSquare)(square);
    })
    .onUpdate((event) => {
      dragX.value = event.translationX;
      dragY.value = event.translationY;
    })
    .onEnd((event) => {
      const distance = Math.hypot(event.translationX, event.translationY);
      const isTap = distance < TAP_DISTANCE_THRESHOLD;
      const col = Math.min(7, Math.max(0, Math.floor(event.x / squareSize)));
      const row = Math.min(7, Math.max(0, Math.floor(event.y / squareSize)));
      const col0 = Math.min(7, Math.max(0, Math.floor(dragOriginX.value / squareSize)));
      const row0 = Math.min(7, Math.max(0, Math.floor(dragOriginY.value / squareSize)));
      const startSquare = displayToSquare(row0, col0, orientation);
      const endX = col * squareSize;
      const endY = row * squareSize;
      runOnJS(handleGestureEnd)(startSquare, endX, endY, isTap);
      dragX.value = withSpring(0);
      dragY.value = withSpring(0);
    });

  const ghostStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragOriginX.value + dragX.value }, { translateY: dragOriginY.value + dragY.value }],
  }), [dragOriginX, dragOriginY, dragX, dragY]);

  return (
    <GestureDetector gesture={panGesture}>
      <View style={{ width: size, height: size, borderRadius: 6, overflow: 'hidden' }}>
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 8 }).map((_, col) => {
            const square = displayToSquare(row, col, orientation);
            const isLight = (row + col) % 2 === 1;
            const isSelected = selectedSquare === square;
            const isLegalTarget = legalTargetsSet.has(square);
            const isLastMove = lastMove?.from === square || lastMove?.to === square;
            const isCheck = checkSquare === square;
            const isDanger = dangerSquaresSet.has(square);
            const isTrap = trapSquaresSet.has(square);
            const piece = pieces.find((p) => p.square === square);
            const isBeingDragged = draggedSquare === square;

            return (
              <View
                key={square}
                style={[
                  styles.square,
                  {
                    width: squareSize,
                    height: squareSize,
                    left: col * squareSize,
                    top: row * squareSize,
                    backgroundColor: isLight ? boardTheme.lightSquare : boardTheme.darkSquare,
                  },
                ]}
              >
                {isLastMove && <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.highlightLastMove }]} />}
                {isCheck && <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.highlightCheck }]} />}
                {isSelected && <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.highlightSelected }]} />}
                {isDanger && <View style={[StyleSheet.absoluteFill, styles.dangerOverlay]} />}
                {isTrap && (
                  <View style={styles.trapWrap} pointerEvents="none">
                    <Text style={[styles.trapGlyph, { fontSize: squareSize * 0.4 }]}>◈</Text>
                  </View>
                )}
                {isLegalTarget && !piece && (
                  <View style={styles.legalDotWrap}>
                    <View style={[styles.legalDot, { backgroundColor: palette.highlightLegal }]} />
                  </View>
                )}
                {isLegalTarget && piece && (
                  <View style={[StyleSheet.absoluteFill, styles.legalCaptureRing, { borderColor: palette.highlightLegal }]} />
                )}
                {piece && !isBeingDragged && (
                  <Text
                    style={[
                      styles.piece,
                      {
                        fontSize: squareSize * 0.72,
                        color: piece.color === 'w' ? pieceTheme.whiteColor : pieceTheme.blackColor,
                        textShadowColor: getPieceGlowColor(piece.color, pieceTheme.glow),
                        textShadowRadius: 8,
                        textShadowOffset: { width: 0, height: 0 },
                      },
                    ]}
                  >
                    {PIECE_GLYPHS[disguisedSquaresSet.has(square) ? 'p' : piece.type]}
                  </Text>
                )}
              </View>
            );
          }),
        )}

        {draggedPiece && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ghostPiece,
              { width: squareSize, height: squareSize },
              ghostStyle,
            ]}
          >
            <Text
              style={[
                styles.piece,
                {
                  fontSize: squareSize * 0.8,
                  color: draggedPiece.color === 'w' ? pieceTheme.whiteColor : pieceTheme.blackColor,
                  textShadowColor: getPieceGlowColor(draggedPiece.color, pieceTheme.glow),
                  textShadowRadius: 10,
                  textShadowOffset: { width: 0, height: 0 },
                },
              ]}
            >
              {PIECE_GLYPHS[draggedPiece.type]}
            </Text>
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}

export { displayToSquare, squareToDisplay };

const styles = StyleSheet.create({
  square: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  piece: {
    fontWeight: '400',
  },
  legalDotWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalDot: {
    width: '32%',
    height: '32%',
    borderRadius: 999,
  },
  legalCaptureRing: {
    borderWidth: 4,
    borderRadius: 999,
    margin: 4,
  },
  dangerOverlay: {
    backgroundColor: 'rgba(255, 106, 43, 0.55)',
  },
  trapWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trapGlyph: {
    color: 'rgba(139, 107, 255, 0.55)',
  },
  ghostPiece: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
