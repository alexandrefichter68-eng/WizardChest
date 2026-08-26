import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/storage/storage';
import type { AppSettings } from '@/types';

const DEFAULT_SETTINGS: AppSettings = {
  language: 'fr',
  musicEnabled: true,
  musicTrack: 'taverne',
  sfxEnabled: true,
  hapticsEnabled: true,
  animationQuality: 'high',
  boardOrientation: 'auto',
  confirmBeforeResign: true,
  defaultTimeControl: 'rapid5',
};

interface SettingsState {
  settings: AppSettings;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: STORAGE_KEYS.settings,
      storage: createJSONStorage(() => AsyncStorage),
      // Deep-merge `settings` specifically so a device that saved data before a new setting
      // (e.g. musicTrack) existed still gets that field's default instead of `undefined`.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<SettingsState> | undefined),
        settings: { ...current.settings, ...(persisted as Partial<SettingsState> | undefined)?.settings },
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
