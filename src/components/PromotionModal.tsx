import type { PieceSymbol } from 'chess.js';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PieceThemeDef } from '@/domain/cosmetics';
import { palette } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

const PROMOTION_CHOICES: { type: PieceSymbol; glyph: string }[] = [
  { type: 'q', glyph: '♛' },
  { type: 'r', glyph: '♜' },
  { type: 'b', glyph: '♝' },
  { type: 'n', glyph: '♞' },
];

interface PromotionModalProps {
  visible: boolean;
  color: 'w' | 'b';
  pieceTheme: PieceThemeDef;
  onSelect: (piece: PieceSymbol) => void;
}

export function PromotionModal({ visible, color, pieceTheme, onSelect }: PromotionModalProps) {
  const { t } = useTranslation();
  const pieceColor = color === 'w' ? pieceTheme.whiteColor : pieceTheme.blackColor;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>{t('game.promotionTitle')}</Text>
          <Text style={styles.subtitle}>{t('game.promoteTo')}</Text>
          <View style={styles.choices}>
            {PROMOTION_CHOICES.map((choice) => (
              <Pressable
                key={choice.type}
                accessibilityRole="button"
                accessibilityLabel={choice.type}
                onPress={() => onSelect(choice.type)}
                style={({ pressed }) => [styles.choice, pressed && styles.choicePressed]}
              >
                <Text style={[styles.glyph, { color: pieceColor }]}>{choice.glyph}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: palette.overlayScrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  panel: {
    backgroundColor: palette.stonePanel,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    color: palette.ivory,
    textAlign: 'center',
    marginBottom: spacing.xxs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: palette.ivoryMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  choices: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  choice: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: palette.stonePanelRaised,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choicePressed: {
    backgroundColor: palette.stoneBorder,
  },
  glyph: {
    fontSize: 40,
  },
});
