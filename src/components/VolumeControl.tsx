import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fontSize } from '@/theme/typography';

const STEPS = 10;

interface VolumeControlProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

/** A simple tap-to-set 10-segment volume bar — no drag gesture, so it works the same on touch and click. */
export function VolumeControl({ value, onChange, label }: VolumeControlProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.percent}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={styles.track}>
        {Array.from({ length: STEPS }).map((_, i) => {
          const stepValue = (i + 1) / STEPS;
          const filled = value >= stepValue - 0.001;
          return (
            <Pressable
              key={i}
              onPress={() => onChange(stepValue)}
              accessibilityRole="adjustable"
              accessibilityLabel={label}
              style={[styles.segment, filled && styles.segmentFilled]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xxs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: palette.ivory,
    fontSize: fontSize.md,
  },
  percent: {
    color: palette.ivoryFaint,
    fontSize: fontSize.sm,
  },
  track: {
    flexDirection: 'row',
    gap: 3,
  },
  segment: {
    flex: 1,
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: palette.stonePanelRaised,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
  },
  segmentFilled: {
    backgroundColor: palette.violet,
    borderColor: palette.violetBright,
  },
});
