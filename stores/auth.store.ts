import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '../lib/supabase/client';
import { useEpisodeProgressStore } from './episodeProgress.store';
import { useListsStore } from './lists.store';
import { useProfileStore } from './profile.store';
import { useSharedListsStore } from './sharedLists.store';
import { useWatchLogStore } from './watchLog.store';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  needsEmailConfirmation: boolean;
  initialize: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  isSubmitting: false,
  error: null,
  needsEmailConfirmation: false,

  initialize: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, isLoading: false });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });
  },

  signIn: async (email, password) => {
    set({ isSubmitting: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ isSubmitting: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to sign in.',
        isSubmitting: false,
      });
    }
  },

  signUp: async (email, password) => {
    set({ isSubmitting: true, error: null, needsEmailConfirmation: false });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      set({ isSubmitting: false, needsEmailConfirmation: !data.session });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to sign up.',
        isSubmitting: false,
      });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network/remote errors — we still clear local auth state below
      // so the user is signed out on the device regardless of connectivity.
    }
    // Explicitly clear the session. Relying solely on the onAuthStateChange
    // listener can leave a stale truthy session momentarily, which makes the
    // login screen immediately redirect back into the app (sign-out "not working").
    set({ session: null, isLoading: false, error: null, needsEmailConfirmation: false });
    useListsStore.getState().reset();
    useSharedListsStore.getState().reset();
    useWatchLogStore.getState().reset();
    useEpisodeProgressStore.getState().reset();
    useProfileStore.getState().reset();
  },
}));
