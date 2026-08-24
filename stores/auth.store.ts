import { create } from 'zustand';

import {
  forgotPassword as forgotPasswordRequest,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  resendVerification as resendVerificationRequest,
  resetPassword as resetPasswordRequest,
  verifyEmail as verifyEmailRequest,
} from '../lib/api/auth';
import { loadRememberPreference, setRememberPreference } from '../lib/api/authStorage';
import { ensureValidToken, onSessionExpired } from '../lib/api/client';
import {
  clearTokens,
  currentTokens,
  decodeUserId,
  loadTokens,
  saveTokens,
  StoredTokens,
} from '../lib/api/tokenStore';
import { useEpisodeProgressStore } from './episodeProgress.store';
import { useListsStore } from './lists.store';
import { useProfileStore } from './profile.store';
import { useRecommendationsStore } from './recommendations.store';
import { useSharedListsStore } from './sharedLists.store';
import { useWatchLogStore } from './watchLog.store';

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  userId: string;
}

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  needsEmailConfirmation: boolean;
  pendingRedirect: string | null;
  setPendingRedirect: (path: string) => void;
  consumePendingRedirect: () => string | null;
  initialize: () => void;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  verifySignUpOtp: (email: string, token: string) => Promise<boolean>;
  resendSignUpOtp: (email: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetPassword: (email: string, token: string, newPassword: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

function sessionFrom(tokens: StoredTokens): Session {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.accessTokenExpiresAt,
    userId: decodeUserId(tokens.accessToken) ?? '',
  };
}

// Shared by signOut and the onSessionExpired listener registered in
// initialize() below -- both mean "this device is signed out now", just
// triggered from different places.
function resetAllDomainStores(): void {
  useListsStore.getState().reset();
  useSharedListsStore.getState().reset();
  useWatchLogStore.getState().reset();
  useEpisodeProgressStore.getState().reset();
  useProfileStore.getState().reset();
  useRecommendationsStore.getState().reset();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isLoading: true,
  isSubmitting: false,
  error: null,
  needsEmailConfirmation: false,
  pendingRedirect: null,

  setPendingRedirect: (path) => set({ pendingRedirect: path }),

  consumePendingRedirect: () => {
    const path = get().pendingRedirect;
    if (path) set({ pendingRedirect: null });
    return path;
  },

  initialize: () => {
    // A refresh that fails after this point (an expired/revoked refresh
    // token, or the account having been deleted) means the same thing
    // everywhere it can happen -- clear local state exactly like signOut does.
    onSessionExpired(() => {
      set({
        session: null,
        isLoading: false,
        error: null,
        needsEmailConfirmation: false,
        pendingRedirect: null,
      });
      resetAllDomainStores();
    });

    // Restore the "remember me" choice before reading the stored tokens, then
    // load them. Both steps guard against a rejection leaving isLoading stuck
    // true, which would otherwise freeze the app on a blank splash.
    loadRememberPreference()
      .catch(() => {
        // Fall back to the default (persist) when the flag can't be read.
      })
      .finally(async () => {
        const stored = await loadTokens();
        if (!stored) {
          set({ session: null, isLoading: false });
          return;
        }

        // Validates the persisted token, refreshing it first if it's stale,
        // so a token that expired while the app was closed doesn't sit around
        // until it naturally 401s on the first request.
        const accessToken = await ensureValidToken();
        if (!accessToken) {
          await clearTokens();
          set({ session: null, isLoading: false });
          return;
        }

        set({ session: sessionFrom(currentTokens()!), isLoading: false });
        // Populates the Listeler tab badge on cold start, before the user
        // ever opens that tab.
        useSharedListsStore.getState().fetchPendingInvites();
      });
  },

  signIn: async (email, password, rememberMe) => {
    set({ isSubmitting: true, error: null });
    try {
      // Set the persistence policy before the tokens are written so they land
      // in the right place (disk vs. memory-only) as soon as they arrive.
      await setRememberPreference(rememberMe);
      const tokens = await loginRequest(email, password);
      const stored: StoredTokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.expiresAt,
      };
      await saveTokens(stored);
      set({ session: sessionFrom(stored), isSubmitting: false });
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
      // Sign-up has no "remember me" toggle, but persistToDisk is a
      // module-level flag that outlives sign-out -- without resetting it
      // here, a fresh account created right after an opted-out session would
      // silently inherit that in-memory-only policy. This also covers
      // verifySignUpOtp below, which writes the tokens that arrive after
      // email confirmation.
      await setRememberPreference(true);
      await registerRequest(email, password);
      // The server never signs an account in before its email is confirmed —
      // there is no "no confirmation needed" branch here the way Supabase had.
      set({ isSubmitting: false, needsEmailConfirmation: true });
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
      const tokens = await verifyEmailRequest(email, token);
      const stored: StoredTokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.expiresAt,
      };
      await saveTokens(stored);
      set({ session: sessionFrom(stored), isSubmitting: false, needsEmailConfirmation: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to verify code.',
        isSubmitting: false,
      });
      return false;
    }
  },

  resendSignUpOtp: async (email) => {
    set({ error: null });
    try {
      await resendVerificationRequest(email);
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to resend code.' });
      return false;
    }
  },

  requestPasswordReset: async (email) => {
    set({ isSubmitting: true, error: null });
    try {
      await forgotPasswordRequest(email);
      set({ isSubmitting: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to send reset code.',
        isSubmitting: false,
      });
      return false;
    }
  },

  resetPassword: async (email, token, newPassword) => {
    set({ isSubmitting: true, error: null });
    try {
      await resetPasswordRequest(email, token, newPassword);
      // Unlike the old Supabase flow (verifying the recovery OTP established
      // a session directly), spending the code here only changes the
      // password server-side. Sign in with it right away so the screen's "a
      // session means the reset worked" redirect still holds.
      const tokens = await loginRequest(email, newPassword);
      const stored: StoredTokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.expiresAt,
      };
      await saveTokens(stored);
      set({ session: sessionFrom(stored), isSubmitting: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to reset password.',
        isSubmitting: false,
      });
      return false;
    }
  },

  signOut: async () => {
    const tokens = currentTokens();
    try {
      if (tokens?.refreshToken) await logoutRequest(tokens.refreshToken);
    } catch {
      // Ignore network/remote errors — we still clear local auth state below
      // so the user is signed out on the device regardless of connectivity.
    }
    await clearTokens();
    // Explicitly clear the session rather than relying on anything reactive:
    // a stale truthy session even briefly makes the login screen bounce
    // straight back into the app ("sign-out not working").
    set({
      session: null,
      isLoading: false,
      error: null,
      needsEmailConfirmation: false,
      pendingRedirect: null,
    });
    resetAllDomainStores();
  },
}));
