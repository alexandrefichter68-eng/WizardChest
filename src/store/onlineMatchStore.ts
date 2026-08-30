import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export interface LiveMatchRow {
  id: string;
  white_id: string;
  black_id: string;
  fen: string;
  pgn: string;
  status: 'active' | 'finished';
  winner: 'white' | 'black' | 'draw' | null;
}

interface RpcResult {
  match_id: string | null;
  white_id: string | null;
  black_id: string | null;
}

interface OnlineMatchState {
  /** True while `online-matchmaking.tsx` is actively polling for an opponent. */
  searching: boolean;
  error: string | null;
  startSearch: (elo: number, onMatched: (matchId: string) => void) => void;
  cancelSearch: () => Promise<void>;
}

let pollTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Polls `find_or_create_match` every few seconds instead of using Realtime for the pairing phase
 * — the RPC is atomic (Postgres `FOR UPDATE SKIP LOCKED`) so re-calling it is always safe, and a
 * few seconds of latency to get matched is imperceptible next to how long "searching" already
 * feels. Realtime is reserved for actual move sync during the game (see online-game.tsx), where
 * latency is felt immediately.
 */
const POLL_INTERVAL_MS = 2500;

export const useOnlineMatchStore = create<OnlineMatchState>()((set, get) => ({
  searching: false,
  error: null,

  startSearch: (elo, onMatched) => {
    set({ searching: true, error: null });

    // Only the FIRST call is allowed to create/join — it either matches immediately or inserts
    // me into the queue. Every call after that must just watch for a match instead of calling
    // find_or_create_match again: that RPC always removes-then-reinserts its caller, so a second
    // call from the still-waiting player would silently drop them from the queue (they'd never
    // learn about a match someone else creates for them, since they're no longer in it to be found).
    const watchForMatch = async () => {
      if (!get().searching) return;
      const myId = useAuthStore.getState().session?.user.id;
      if (!myId) return;
      const { data, error } = await supabase
        .from('live_matches')
        .select('id')
        .or(`white_id.eq.${myId},black_id.eq.${myId}`)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
      if (!get().searching) return;
      if (error) {
        set({ searching: false, error: error.message });
        return;
      }
      const match = data?.[0];
      if (match) {
        set({ searching: false });
        onMatched(match.id);
        return;
      }
      pollTimer = setTimeout(() => void watchForMatch(), POLL_INTERVAL_MS);
    };

    void (async () => {
      const { data, error } = await supabase.rpc('find_or_create_match', { p_elo: elo });
      if (!get().searching) return;
      if (error) {
        set({ searching: false, error: error.message });
        return;
      }
      const row = (Array.isArray(data) ? data[0] : data) as RpcResult | undefined;
      if (row?.match_id) {
        set({ searching: false });
        onMatched(row.match_id);
        return;
      }
      pollTimer = setTimeout(() => void watchForMatch(), POLL_INTERVAL_MS);
    })();
  },

  cancelSearch: async () => {
    set({ searching: false });
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    const myId = useAuthStore.getState().session?.user.id;
    if (myId) await supabase.from('matchmaking_queue').delete().eq('user_id', myId);
  },
}));
