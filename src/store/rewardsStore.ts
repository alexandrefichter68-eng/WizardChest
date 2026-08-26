import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getAchievementById } from '@/domain/achievements';
import { STORAGE_KEYS } from '@/storage/storage';
import type { Achievement, UnlockedAchievement } from '@/types';

interface RewardsState {
  unlocked: UnlockedAchievement[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  isUnlocked: (achievementId: string) => boolean;
  /** Unlocks achievements not already unlocked; returns the newly-unlocked ones (for a toast/modal). */
  unlockMany: (achievementIds: string[]) => Achievement[];
  resetRewards: () => void;
}

export const useRewardsStore = create<RewardsState>()(
  persist(
    (set, get) => ({
      unlocked: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      isUnlocked: (achievementId) => get().unlocked.some((u) => u.achievementId === achievementId),

      unlockMany: (achievementIds) => {
        const state = get();
        const alreadyUnlocked = new Set(state.unlocked.map((u) => u.achievementId));
        const newlyUnlockedIds = achievementIds.filter((id) => !alreadyUnlocked.has(id));
        if (newlyUnlockedIds.length === 0) return [];

        const now = Date.now();
        set({
          unlocked: [
            ...state.unlocked,
            ...newlyUnlockedIds.map((achievementId) => ({ achievementId, unlockedAt: now })),
          ],
        });

        return newlyUnlockedIds
          .map((id) => getAchievementById(id))
          .filter((a): a is Achievement => a !== undefined);
      },

      resetRewards: () => set({ unlocked: [] }),
    }),
    {
      name: STORAGE_KEYS.achievements,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
