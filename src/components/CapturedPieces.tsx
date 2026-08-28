import type { PieceSymbol } from 'chess.js';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme/colors';
import { fontSize } from '@/theme/typography';

const GLYPHS: Record<PieceSymbol, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
};

/** Standard chess.com-style ordering: pawns first, then ascending material value. */
const DISPLAY_ORDER: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q'];

interface CapturedPiecesProps {
  /** Types of this color's own pieces currently missing from the board — i.e. what the opponent has captured. */
  missingPieces: PieceSymbol[];
  /** Material lead for this side (their captures minus the opponent's), in standard pawn units — omitted/0 shows nothing. */
  advantage: number;
}

/** Small row of piece glyphs (chess.com-style) showing what's been captured, plus a material-lead badge. */
export function CapturedPieces({ missingPieces, advantage }: CapturedPiecesProps) {
  if (missingPieces.length === 0) return null;
  const counts: Partial<Record<PieceSymbol, number>> = {};
  for (const type of missingPieces) counts[type] = (counts[type] ?? 0) + 1;

  return (
    <View style={styles.row}>
      {DISPLAY_ORDER.filter((type) => counts[type]).map((type) => (
        <View key={type} style={styles.pieceGroup}>
          <Text style={styles.glyph}>{GLYPHS[type]}</Text>
          {(counts[type] ?? 0) > 1 && <Text style={styles.count}>×{counts[type]}</Text>}
        </View>
      ))}
      {advantage > 0 && <Text style={styles.advantage}>+{advantage}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  pieceGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  glyph: {
    fontSize: fontSize.md,
    color: palette.ivoryMuted,
  },
  count: {
    fontSize: 10,
    color: palette.ivoryFaint,
    marginLeft: 1,
  },
  advantage: {
    fontSize: fontSize.xs,
    color: palette.goldBright,
    fontWeight: '700',
    marginLeft: 4,
  },
});
