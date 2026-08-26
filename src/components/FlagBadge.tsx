import { Text, type StyleProp, type TextStyle } from 'react-native';
import { countryCodeToFlagEmoji } from '@/utils/flags';

interface FlagBadgeProps {
  countryCode: string;
  size?: number;
  style?: StyleProp<TextStyle>;
}

export function FlagBadge({ countryCode, size = 18, style }: FlagBadgeProps) {
  return (
    <Text style={[{ fontSize: size }, style]} accessibilityLabel={countryCode}>
      {countryCodeToFlagEmoji(countryCode)}
    </Text>
  );
}
