import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';

export function useHaptics() {
  const hapticsEnabled = useSettingsStore((s) => s.settings.hapticsEnabled);

  const trigger = useCallback(
    (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
      if (!hapticsEnabled || Platform.OS === 'web') return;
      void Haptics.impactAsync(style).catch(() => {});
    },
    [hapticsEnabled],
  );

  const notify = useCallback(
    (type: Haptics.NotificationFeedbackType) => {
      if (!hapticsEnabled || Platform.OS === 'web') return;
      void Haptics.notificationAsync(type).catch(() => {});
    },
    [hapticsEnabled],
  );

  return {
    tap: () => trigger(Haptics.ImpactFeedbackStyle.Light),
    move: () => trigger(Haptics.ImpactFeedbackStyle.Medium),
    capture: () => trigger(Haptics.ImpactFeedbackStyle.Heavy),
    success: () => notify(Haptics.NotificationFeedbackType.Success),
    warning: () => notify(Haptics.NotificationFeedbackType.Warning),
    error: () => notify(Haptics.NotificationFeedbackType.Error),
  };
}
