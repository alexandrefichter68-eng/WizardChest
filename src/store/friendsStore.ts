import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export interface FriendProfile {
  id: string;
  username: string;
}

interface FriendRequestRow {
  id: string;
  status: 'pending' | 'accepted';
  requester: FriendProfile;
  addressee: FriendProfile;
}

interface FriendsState {
  friends: { requestId: string; profile: FriendProfile }[];
  incoming: { requestId: string; from: FriendProfile }[];
  outgoing: { requestId: string; to: FriendProfile }[];
  searchResults: FriendProfile[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  clearSearch: () => void;
  sendRequest: (userId: string) => Promise<string | null>;
  acceptRequest: (requestId: string) => Promise<void>;
  removeRequest: (requestId: string) => Promise<void>;
}

function currentUserId(): string | null {
  return useAuthStore.getState().session?.user.id ?? null;
}

export const useFriendsStore = create<FriendsState>()((set, get) => ({
  friends: [],
  incoming: [],
  outgoing: [],
  searchResults: [],
  loading: false,
  error: null,

  refresh: async () => {
    const myId = currentUserId();
    if (!myId) return;
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('friend_requests')
      .select(
        'id, status, requester:profiles!friend_requests_requester_id_fkey(id,username), addressee:profiles!friend_requests_addressee_id_fkey(id,username)',
      )
      .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    const rows = (data ?? []) as unknown as FriendRequestRow[];
    const friends: { requestId: string; profile: FriendProfile }[] = [];
    const incoming: { requestId: string; from: FriendProfile }[] = [];
    const outgoing: { requestId: string; to: FriendProfile }[] = [];
    for (const row of rows) {
      const iAmRequester = row.requester.id === myId;
      const other = iAmRequester ? row.addressee : row.requester;
      if (row.status === 'accepted') friends.push({ requestId: row.id, profile: other });
      else if (iAmRequester) outgoing.push({ requestId: row.id, to: other });
      else incoming.push({ requestId: row.id, from: other });
    }
    set({ friends, incoming, outgoing, loading: false });
  },

  searchUsers: async (query) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      set({ searchResults: [] });
      return;
    }
    const myId = currentUserId();
    let request = supabase.from('profiles').select('id, username').ilike('username', `%${trimmed}%`).limit(10);
    if (myId) request = request.neq('id', myId);
    const { data, error } = await request;
    if (error) {
      set({ error: error.message });
      return;
    }
    set({ searchResults: data ?? [] });
  },

  clearSearch: () => set({ searchResults: [] }),

  sendRequest: async (userId) => {
    const myId = currentUserId();
    if (!myId) return 'Non connecté.';
    const { error } = await supabase.from('friend_requests').insert({ requester_id: myId, addressee_id: userId });
    if (error) {
      if (error.message.toLowerCase().includes('duplicate')) return 'Demande déjà envoyée, ou déjà amis.';
      return error.message;
    }
    await get().refresh();
    return null;
  },

  acceptRequest: async (requestId) => {
    await supabase.from('friend_requests').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', requestId);
    await get().refresh();
  },

  removeRequest: async (requestId) => {
    await supabase.from('friend_requests').delete().eq('id', requestId);
    await get().refresh();
  },
}));
