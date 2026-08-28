import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/storage/storage';

interface AuthState {
  hasAccount: boolean;
  hasHydrated: boolean;
  /**
   * Stored in plain text on-device only — there is no server yet, "login" is a local mockup that
   * never validates against these (see the in-app warning telling players never to use a real
   * password). Kept purely so the multiplayer login screen has real fields to build on later.
   */
  login: string;
  password: string;
  setHasHydrated: (value: boolean) => void;
  register: (login: string, password: string) => void;
  clearAccount: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hasAccount: false,
      hasHydrated: false,
      login: '',
      password: '',
      setHasHydrated: (value) => set({ hasHydrated: value }),
      register: (login, password) => set({ hasAccount: true, login, password }),
      clearAccount: () => set({ hasAccount: false, login: '', password: '' }),
    }),
    {
      name: STORAGE_KEYS.auth,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
