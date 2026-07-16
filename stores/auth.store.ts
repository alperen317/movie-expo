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
  verifySignUpOtp: (email: string, token: string) => Promise<boolean>;
  resendSignUpOtp: (email: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  verifyPasswordResetOtp: (email: string, token: string, newPassword: string) => Promise<boolean>;
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

  verifySignUpOtp: async (email, token) => {
    set({ isSubmitting: true, error: null });
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
      if (error) throw error;
      set({ isSubmitting: false, needsEmailConfirmation: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Kod doğrulanamadı.',
        isSubmitting: false,
      });
      return false;
    }
  },

  resendSignUpOtp: async (email) => {
    set({ error: null });
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Kod tekrar gönderilemedi.' });
      return false;
    }
  },

  requestPasswordReset: async (email) => {
    set({ isSubmitting: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      set({ isSubmitting: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'İstek gönderilemedi.',
        isSubmitting: false,
      });
      return false;
    }
  },

  verifyPasswordResetOtp: async (email, token, newPassword) => {
    set({ isSubmitting: true, error: null });
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });
      if (verifyError) throw verifyError;
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      set({ isSubmitting: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Şifre güncellenemedi.',
        isSubmitting: false,
      });
      return false;
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
