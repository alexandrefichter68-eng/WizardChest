import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { palette } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';
import type { GameResultKind } from '@/types';

interface GameOverPanelProps {
  visible: boolean;
  result: GameResultKind;
  reasonLabel: string;
  onViewResult: () => void;
  onQuit: () => void;
  viewResultLabel: string;
  quitLabel: string;
}

const RESULT_COLOR: Record<GameResultKind, string> = {
  win: palette.success,
  loss: palette.danger,
  draw: palette.warning,
};

/**
 * Shown over the board once the game ends, instead of navigating away immediately — the final
 * position stays visible underneath so the player can look it over before choosing to leave.
 */
export function GameOverPanel({
  visible,
  result,
  reasonLabel,
  onViewResult,
  onQuit,
  viewResultLabel,
  quitLabel,
}: GameOverPanelProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.panel}>
          <Text style={[styles.resultTitle, { color: RESULT_COLOR[result] }]}>{reasonLabel}</Text>
          <View style={styles.buttons}>
            <Button label={quitLabel} variant="secondary" onPress={onQuit} style={styles.button} />
            <Button label={viewResultLabel} onPress={onViewResult} style={styles.button} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  panel: {
    backgroundColor: palette.stonePanel,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.gold,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  resultTitle: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
});
