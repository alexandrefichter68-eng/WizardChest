import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { palette } from '@/theme/colors';
import type { AvatarSpec } from '@/types';

interface AvatarProps {
  avatar: AvatarSpec;
  size?: number;
}

/**
 * Deterministic, code-generated avatar: a gradient disc (hue from the seed) with the player's
 * initials and a small variant ring/dot pattern. No external image assets required.
 */
export function Avatar({ avatar, size = 56 }: AvatarProps) {
  const gradientId = `avatar-grad-${avatar.seed}-${avatar.hue}`;
  const hue = avatar.hue;
  const colorA = `hsl(${hue}, 55%, 38%)`;
  const colorB = `hsl(${(hue + 45) % 360}, 60%, 22%)`;
  const ringColor = `hsl(${(hue + 30) % 360}, 70%, 65%)`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colorA} />
          <Stop offset="100%" stopColor={colorB} />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="50" r="48" fill={`url(#${gradientId})`} stroke={palette.stoneBorder} strokeWidth="2" />
      {avatar.variant === 1 && (
        <Circle cx="50" cy="50" r="40" fill="none" stroke={ringColor} strokeWidth="2" opacity={0.6} />
      )}
      {avatar.variant === 2 && <Circle cx="78" cy="22" r="6" fill={ringColor} opacity={0.85} />}
      {avatar.variant === 3 && (
        <Circle cx="50" cy="50" r="46" fill="none" stroke={ringColor} strokeWidth="4" opacity={0.4} />
      )}
      {avatar.variant === 4 && <Circle cx="22" cy="78" r="5" fill={ringColor} opacity={0.8} />}
      {avatar.variant === 5 && (
        <>
          <Circle cx="78" cy="22" r="4" fill={ringColor} opacity={0.8} />
          <Circle cx="22" cy="78" r="4" fill={ringColor} opacity={0.8} />
        </>
      )}
      <SvgText
        x="50"
        y="62"
        fontSize="34"
        fontWeight="700"
        fill={palette.ivory}
        textAnchor="middle"
        fontFamily="Georgia"
      >
        {avatar.initials}
      </SvgText>
    </Svg>
  );
}
