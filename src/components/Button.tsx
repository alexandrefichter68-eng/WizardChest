import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useHaptics } from '@/hooks/useHaptics';
import { useSfx } from '@/hooks/useSfx';
import { palette } from '@/theme/colors';
import { minTouchTarget, radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading, style, testID }: ButtonProps) {
  const haptics = useHaptics();
  const playSfx = useSfx();

  const handlePress = () => {
    if (disabled || loading) return;
    haptics.tap();
    playSfx('click');
    onPress();
  };

  if (variant === 'primary') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled || loading }}
        onPress={handlePress}
        disabled={disabled || loading}
        testID={testID}
        style={({ pressed }) => [pressed && !disabled && styles.pressed, (disabled || loading) && styles.disabled, style]}
      >
        <LinearGradient
          colors={[palette.goldBright, palette.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, styles.primaryGlow]}
        >
          {loading ? (
            <ActivityIndicator color={palette.voidBlack} />
          ) : (
            <Text style={[styles.label, styles.labelPrimary]}>{label}</Text>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      onPress={handlePress}
      disabled={disabled || loading}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        variant === 'ghost' && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? palette.violet : palette.voidBlack} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'secondary' && styles.labelSecondary,
            variant === 'danger' && styles.labelPrimary,
            variant === 'ghost' && styles.labelGhost,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  primaryGlow: {
    shadowColor: palette.gold,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  secondary: {
    backgroundColor: palette.stonePanelRaised,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
  },
  danger: {
    backgroundColor: palette.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  label: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  labelPrimary: {
    color: palette.voidBlack,
  },
  labelSecondary: {
    color: palette.ivory,
  },
  labelGhost: {
    color: palette.violetBright,
  },
});
