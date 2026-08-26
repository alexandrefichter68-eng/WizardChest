import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';
import { getDivisionById } from '@/domain/divisions';
import { palette } from '@/theme/colors';
import type { DivisionId } from '@/types';

interface DivisionBadgeProps {
  divisionId: DivisionId;
  size?: number;
  showEmblemOnly?: boolean;
}

export function DivisionBadge({ divisionId, size = 48, showEmblemOnly = true }: DivisionBadgeProps) {
  const division = getDivisionById(divisionId);

  return (
    <LinearGradient
      colors={[division.color, palette.stoneDark]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, borderColor: division.color },
      ]}
    >
      <Text style={{ fontSize: size * 0.46 }} accessibilityLabel={division.nameKey}>
        {division.emblem}
      </Text>
      {!showEmblemOnly && (
        <Text style={[styles.label, { color: palette.ivory }]} numberOfLines={1}>
          {division.id}
        </Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
  },
});
