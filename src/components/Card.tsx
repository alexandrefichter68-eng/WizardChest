import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.stonePanel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
