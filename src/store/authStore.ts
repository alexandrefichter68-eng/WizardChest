import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/store/profileStore';

// Supabase Auth is email/password only — there's no separate "username" login mode — so a real
// account is created behind a synthesized address at this fake domain (never sent any mail, never
// meant to be deliverable). Login/signup UI only ever shows the player their identifiant, never
// this address. Keeps the account real (recognized across devices) without adding an email field
// nobody asked for.
const FAKE_EMAIL_DOMAIN = 'wizardchest.local';

function emailForUsername(username: string): string {
  return `${username.trim().toLowerCase()}@${FAKE_EMAIL_DOMAIN}`;
}

interface AuthState {
  session: Session | null;
  hasHydrated: boolean;
  signUp: (username: string, password: string) => Promise<string | null>;
  signIn: (username: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already exists') || lower.includes('duplicate')) {
    return 'Cet identifiant est déjà pris.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Identifiant ou mot de passe incorrect.';
  }
  if (lower.includes('password') && lower.includes('character')) {
    return 'Le mot de passe doit faire au moins 6 caractères.';
  }
  return message;
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  hasHydrated: false,

  signUp: async (username, password) => {
    const trimmed = username.trim();
    if (trimmed.length < 3) return 'Identifiant trop court (3 caractères minimum).';

    const { data, error } = await supabase.auth.signUp({
      email: emailForUsername(trimmed),
      password,
      options: { data: { username: trimmed } },
    });
    if (error) return friendlyAuthError(error.message);
    if (!data.user) return 'Inscription impossible, réessaie.';

    const { error: profileError } = await supabase.from('profiles').insert({ id: data.user.id, username: trimmed });
    if (profileError) return friendlyAuthError(profileError.message);

    useProfileStore.getState().setUsername(trimmed);
    set({ session: data.session });
    return null;
  },

  signIn: async (username, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailForUsername(username),
      password,
    });
    if (error) return friendlyAuthError(error.message);
    const sessionUsername = data.user?.user_metadata?.username;
    if (typeof sessionUsername === 'string') useProfileStore.getState().setUsername(sessionUsername);
    set({ session: data.session });
    return null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));

void supabase.auth.getSession().then(({ data }) => {
  useAuthStore.setState({ session: data.session, hasHydrated: true });
});

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({ session });
});
