import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { palette } from '@/theme/colors';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Shared dark-fantasy backdrop for every screen: near-black void fading into a deep violet stone tone. */
export function ScreenBackground({ children, style }: ScreenBackgroundProps) {
  return (
    <LinearGradient
      colors={[palette.voidBlack, palette.stoneDark, palette.voidBlack]}
      locations={[0, 0.55, 1]}
      style={[styles.fill, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
