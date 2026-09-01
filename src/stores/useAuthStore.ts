import { create } from 'zustand';
import { Profile } from '@/types/database.types';
import { MOCK_PROFILE } from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';

interface AuthState {
  user: unknown | null;
  profile: Profile | null;
  isLoading: boolean;
  isGuest: boolean;
  fetchProfile: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  addXP: (amount: number, newCombo?: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: MOCK_PROFILE,
  isLoading: false,
  isGuest: true,

  fetchProfile: async () => {
    try {
      set({ isLoading: true });
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          set({ user, profile: profile as Profile, isGuest: false });
        } else {
          set({ user, isGuest: false });
        }
      } else {
        set({ user: null, profile: MOCK_PROFILE, isGuest: true });
      }
    } catch {
      // Fallback to mock profile if offline or Supabase not yet configured
      set({ profile: MOCK_PROFILE, isGuest: true });
    } finally {
      set({ isLoading: false });
    }
  },

  signInAnonymously: async () => {
    try {
      set({ isLoading: true });
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInAnonymously();
      if (!error && data.user) {
        await get().fetchProfile();
      }
    } catch {
      set({ isGuest: true });
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      set({ user: null, profile: MOCK_PROFILE, isGuest: true });
    }
  },

  addXP: (amount: number, newCombo: number = 0) => {
    set((state) => {
      if (!state.profile) return state;
      const newTotal = state.profile.total_xp + amount;
      const newLevel = Math.max(1, Math.floor(Math.sqrt(newTotal / 100)) + 1);
      return {
        profile: {
          ...state.profile,
          total_xp: newTotal,
          level: newLevel,
          highest_combo: Math.max(state.profile.highest_combo, newCombo),
          total_games_played: state.profile.total_games_played + 1,
        },
      };
    });
  },
}));
