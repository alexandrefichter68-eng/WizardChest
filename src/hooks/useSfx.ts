import { useCallback } from 'react';
import { playSfx, type SfxName } from '@/audio/sounds';
import { useSettingsStore } from '@/store/settingsStore';

export function useSfx() {
  const sfxEnabled = useSettingsStore((s) => s.settings.sfxEnabled);

  return useCallback((name: SfxName) => playSfx(name, sfxEnabled), [sfxEnabled]);
}
