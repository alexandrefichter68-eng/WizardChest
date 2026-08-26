import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { driftLeaderboard, generateLeaderboardPool, resetSeasonAnchors, type LeaderboardBot } from '@/domain/leaderboard';
import { STORAGE_KEYS } from '@/storage/storage';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEASON_LENGTH_MS = 30 * ONE_DAY_MS;

interface LeaderboardState {
  bots: LeaderboardBot[];
  lastDriftAt: number | null;
  seasonStartAt: number | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  ensureInitialized: (playerElo: number) => void;
  refreshIfNeeded: () => void;
}

export const useLeaderboardStore = create<LeaderboardState>()(
  persist(
    (set, get) => ({
      bots: [],
      lastDriftAt: null,
      seasonStartAt: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      ensureInitialized: (playerElo) => {
        const state = get();
        if (state.bots.length > 0) return;
        set({
          bots: generateLeaderboardPool(playerElo),
          lastDriftAt: Date.now(),
          seasonStartAt: Date.now(),
        });
      },

      refreshIfNeeded: () => {
        const state = get();
        if (state.bots.length === 0) return;
        const now = Date.now();

        let bots = state.bots;
        let seasonStartAt = state.seasonStartAt ?? now;

        if (seasonStartAt !== null && now - seasonStartAt > SEASON_LENGTH_MS) {
          bots = resetSeasonAnchors(bots);
          seasonStartAt = now;
        }

        if (!state.lastDriftAt || now - state.lastDriftAt > ONE_DAY_MS) {
          bots = driftLeaderboard(bots, `drift:${now}`);
          set({ bots, lastDriftAt: now, seasonStartAt });
        } else if (seasonStartAt !== state.seasonStartAt) {
          set({ bots, seasonStartAt });
        }
      },
    }),
    {
      name: STORAGE_KEYS.leaderboard,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
