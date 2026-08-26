import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createAvatarForUsername } from '@/domain/avatar';
import { getDivisionForElo } from '@/domain/divisions';
import { applyEloDelta, computeEloDelta, STARTING_ELO, type MatchScore } from '@/domain/elo';
import { USERNAME_PREFIXES, USERNAME_SUFFIXES } from '@/domain/opponentNames';
import { computeDailyRewardXp, levelFromTotalXp } from '@/domain/xp';
import { STORAGE_KEYS } from '@/storage/storage';
import { createSeededRng, pick, randomInt } from '@/utils/random';
import type { GameResultKind, PlayerProfile } from '@/types';

function createDefaultProfile(): PlayerProfile {
  const rng = createSeededRng(`new-player:${Date.now()}:${Math.random()}`);
  const username = `${pick(rng, USERNAME_PREFIXES)}${pick(rng, USERNAME_SUFFIXES)}${randomInt(rng, 10, 99)}`;
  return {
    id: `player-${Date.now()}-${Math.floor(rng() * 1e9)}`,
    username,
    avatar: createAvatarForUsername(username),
    countryCode: 'FR',
    elo: STARTING_ELO,
    division: getDivisionForElo(STARTING_ELO).id,
    xp: 0,
    level: 1,
    winStreak: 0,
    bestWinStreak: 0,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    createdAt: Date.now(),
    lastDailyRewardAt: null,
    dailyRewardStreak: 0,
    unlockedBoardThemes: ['pierre_ivoire'],
    unlockedPieceThemes: ['classique'],
    activeBoardTheme: 'pierre_ivoire',
    activePieceTheme: 'classique',
  };
}

export interface ApplyGameResultParams {
  result: GameResultKind;
  opponentElo: number;
  xpGained: number;
}

export interface ApplyGameResultOutcome {
  eloBefore: number;
  eloAfter: number;
  eloDelta: number;
  divisionChanged: boolean;
  leveledUp: boolean;
}

interface ProfileState {
  profile: PlayerProfile;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setUsername: (username: string) => void;
  setCountryCode: (countryCode: string) => void;
  applyGameResult: (params: ApplyGameResultParams) => ApplyGameResultOutcome;
  claimDailyReward: () => { xpGained: number; streak: number } | null;
  setActiveBoardTheme: (themeId: string) => void;
  setActivePieceTheme: (themeId: string) => void;
  unlockBoardTheme: (themeId: string) => void;
  unlockPieceTheme: (themeId: string) => void;
  resetProgress: () => void;
}

function isSameCalendarDay(a: number, b: number): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function isNextCalendarDay(previous: number, now: number): boolean {
  const oneDayMs = 24 * 60 * 60 * 1000;
  const diff = now - previous;
  return diff >= oneDayMs && diff < oneDayMs * 2;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: createDefaultProfile(),
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      setUsername: (username) => {
        const trimmed = username.trim().slice(0, 24);
        if (!trimmed) return;
        set((state) => ({
          profile: { ...state.profile, username: trimmed, avatar: createAvatarForUsername(trimmed) },
        }));
      },

      setCountryCode: (countryCode) => {
        set((state) => ({ profile: { ...state.profile, countryCode } }));
      },

      applyGameResult: ({ result, opponentElo, xpGained }) => {
        const state = get();
        const eloBefore = state.profile.elo;
        const score: MatchScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
        const delta = computeEloDelta(eloBefore, opponentElo, score, state.profile.gamesPlayed);
        const eloAfter = applyEloDelta(eloBefore, delta);
        const divisionBefore = getDivisionForElo(eloBefore).id;
        const divisionAfter = getDivisionForElo(eloAfter).id;
        const totalXp = state.profile.xp + xpGained;
        const { level: levelAfter } = levelFromTotalXp(totalXp);
        const leveledUp = levelAfter > state.profile.level;
        const winStreak = result === 'win' ? state.profile.winStreak + 1 : 0;

        set({
          profile: {
            ...state.profile,
            elo: eloAfter,
            division: divisionAfter,
            xp: totalXp,
            level: levelAfter,
            winStreak,
            bestWinStreak: Math.max(state.profile.bestWinStreak, winStreak),
            gamesPlayed: state.profile.gamesPlayed + 1,
            wins: state.profile.wins + (result === 'win' ? 1 : 0),
            losses: state.profile.losses + (result === 'loss' ? 1 : 0),
            draws: state.profile.draws + (result === 'draw' ? 1 : 0),
          },
        });

        return {
          eloBefore,
          eloAfter,
          eloDelta: eloAfter - eloBefore,
          divisionChanged: divisionBefore !== divisionAfter,
          leveledUp,
        };
      },

      claimDailyReward: () => {
        const state = get();
        const now = Date.now();
        const last = state.profile.lastDailyRewardAt;
        if (last !== null && isSameCalendarDay(last, now)) {
          return null;
        }
        const streak = last !== null && isNextCalendarDay(last, now) ? state.profile.dailyRewardStreak + 1 : 1;
        const xpGained = computeDailyRewardXp(streak);
        const totalXp = state.profile.xp + xpGained;
        const { level } = levelFromTotalXp(totalXp);
        set({
          profile: {
            ...state.profile,
            xp: totalXp,
            level,
            lastDailyRewardAt: now,
            dailyRewardStreak: streak,
          },
        });
        return { xpGained, streak };
      },

      setActiveBoardTheme: (themeId) => set((state) => ({ profile: { ...state.profile, activeBoardTheme: themeId } })),
      setActivePieceTheme: (themeId) => set((state) => ({ profile: { ...state.profile, activePieceTheme: themeId } })),

      unlockBoardTheme: (themeId) =>
        set((state) => ({
          profile: {
            ...state.profile,
            unlockedBoardThemes: state.profile.unlockedBoardThemes.includes(themeId)
              ? state.profile.unlockedBoardThemes
              : [...state.profile.unlockedBoardThemes, themeId],
          },
        })),

      unlockPieceTheme: (themeId) =>
        set((state) => ({
          profile: {
            ...state.profile,
            unlockedPieceThemes: state.profile.unlockedPieceThemes.includes(themeId)
              ? state.profile.unlockedPieceThemes
              : [...state.profile.unlockedPieceThemes, themeId],
          },
        })),

      resetProgress: () => set({ profile: createDefaultProfile() }),
    }),
    {
      name: STORAGE_KEYS.profile,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
