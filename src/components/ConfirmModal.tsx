import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { palette } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Custom in-app confirmation dialog. Used instead of the RN `Alert` API, which is unreliable
 * across platforms (notably a no-op on web) — this renders identically everywhere and matches
 * the app's dark fantasy styling.
 */
export function ConfirmModal({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>{title}</Text>
          {body && <Text style={styles.body}>{body}</Text>}
          <View style={styles.buttons}>
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} style={styles.button} />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={styles.button}
            />
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
    maxWidth: 380,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    color: palette.ivory,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: fontSize.sm,
    color: palette.ivoryMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
  },
});
