import type { TimeControl, TimeControlPreset } from '@/types';

export const TIME_CONTROL_PRESETS: Record<TimeControlPreset, TimeControl> = {
  blitz3: { preset: 'blitz3', initialSeconds: 180, incrementSeconds: 0 },
  rapid5: { preset: 'rapid5', initialSeconds: 300, incrementSeconds: 3 },
  rapid10: { preset: 'rapid10', initialSeconds: 600, incrementSeconds: 5 },
  classical15: { preset: 'classical15', initialSeconds: 900, incrementSeconds: 10 },
};

export const TIME_CONTROL_LABELS: Record<TimeControlPreset, string> = {
  blitz3: '3 min',
  rapid5: '5 min',
  rapid10: '10 min',
  classical15: '15 min',
};

export function getTimeControl(preset: TimeControlPreset): TimeControl {
  return TIME_CONTROL_PRESETS[preset];
}
