import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/storage/storage';
import type { GameHistoryEntry } from '@/types';

/** Keeps the device's local storage bounded — oldest games are dropped past this count. */
const MAX_HISTORY_ENTRIES = 300;

interface HistoryState {
  entries: GameHistoryEntry[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addEntry: (entry: GameHistoryEntry) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      addEntry: (entry) =>
        set((state) => ({
          entries: [entry, ...state.entries].slice(0, MAX_HISTORY_ENTRIES),
        })),
      clearHistory: () => set({ entries: [] }),
    }),
    {
      name: STORAGE_KEYS.history,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
