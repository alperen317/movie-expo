// Declared before the jest.mock() calls below (and before any imports) so
// the "mock"-prefixed name is visible inside the hoisted factories -- see
// https://jestjs.io/docs/es6-class-mocks#calling-jestmock-with-the-module-factory-parameter.
const mockEpisodeProgressReset = jest.fn();
const mockListsReset = jest.fn();
const mockProfileReset = jest.fn();
const mockRecommendationsReset = jest.fn();
const mockSharedListsReset = jest.fn();
const mockSharedListsFetchPendingInvites = jest.fn();
const mockWatchLogReset = jest.fn();

jest.mock('../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      verifyOtp: jest.fn(),
      resend: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

jest.mock('../lib/supabase/authStorage', () => ({
  loadRememberPreference: jest.fn(),
  setRememberPreference: jest.fn(),
}));

// signOut() fans out to reset() on every other domain store -- mocked as
// modules so this file only exercises auth.store's own logic, not each
// sibling store's (they get their own test files).
jest.mock('./episodeProgress.store', () => ({
  useEpisodeProgressStore: { getState: () => ({ reset: mockEpisodeProgressReset }) },
}));
jest.mock('./lists.store', () => ({
  useListsStore: { getState: () => ({ reset: mockListsReset }) },
}));
jest.mock('./profile.store', () => ({
  useProfileStore: { getState: () => ({ reset: mockProfileReset }) },
}));
jest.mock('./recommendations.store', () => ({
  useRecommendationsStore: { getState: () => ({ reset: mockRecommendationsReset }) },
}));
jest.mock('./sharedLists.store', () => ({
  useSharedListsStore: {
    getState: () => ({
      reset: mockSharedListsReset,
      fetchPendingInvites: mockSharedListsFetchPendingInvites,
    }),
  },
}));
jest.mock('./watchLog.store', () => ({
  useWatchLogStore: { getState: () => ({ reset: mockWatchLogReset }) },
}));

import { setRememberPreference } from '../lib/supabase/authStorage';
import { supabase } from '../lib/supabase/client';
import { useAuthStore } from './auth.store';

import type { Session } from '@supabase/supabase-js';

const mockSignInWithPassword = supabase.auth.signInWithPassword as jest.Mock;
const mockSignUp = supabase.auth.signUp as jest.Mock;
const mockVerifyOtp = supabase.auth.verifyOtp as jest.Mock;
const mockUpdateUser = supabase.auth.updateUser as jest.Mock;
const mockSignOut = supabase.auth.signOut as jest.Mock;
const mockSetRememberPreference = setRememberPreference as jest.Mock;

const session = { user: { id: 'user-1' } } as unknown as Session;

describe('auth.store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      session: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      needsEmailConfirmation: false,
      pendingRedirect: null,
    });
    jest.clearAllMocks();
    mockSetRememberPreference.mockResolvedValue(undefined);
  });

  describe('signIn', () => {
    it('persists the remember-me preference before signing in and clears submitting/error on success', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      await useAuthStore.getState().signIn('a@b.com', 'password123', true);

      expect(mockSetRememberPreference).toHaveBeenCalledWith(true);
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'password123',
      });
      expect(useAuthStore.getState().isSubmitting).toBe(false);
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('sets an error message and clears isSubmitting when sign-in fails', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: new Error('Invalid credentials') });

      await useAuthStore.getState().signIn('a@b.com', 'wrong', false);

      expect(useAuthStore.getState().error).toBe('Invalid credentials');
      expect(useAuthStore.getState().isSubmitting).toBe(false);
    });
  });

  describe('signUp', () => {
    it('flags needsEmailConfirmation when sign-up succeeds without a session', async () => {
      mockSignUp.mockResolvedValue({ data: { session: null }, error: null });

      await useAuthStore.getState().signUp('a@b.com', 'password123');

      expect(useAuthStore.getState().needsEmailConfirmation).toBe(true);
    });

    it('does not flag needsEmailConfirmation when sign-up returns a session directly', async () => {
      mockSignUp.mockResolvedValue({ data: { session }, error: null });

      await useAuthStore.getState().signUp('a@b.com', 'password123');

      expect(useAuthStore.getState().needsEmailConfirmation).toBe(false);
    });
  });

  describe('verifySignUpOtp', () => {
    it('returns true and clears needsEmailConfirmation on a valid code', async () => {
      useAuthStore.setState({ needsEmailConfirmation: true });
      mockVerifyOtp.mockResolvedValue({ error: null });

      const result = await useAuthStore.getState().verifySignUpOtp('a@b.com', '123456');

      expect(result).toBe(true);
      expect(useAuthStore.getState().needsEmailConfirmation).toBe(false);
    });

    it('returns false and sets an error on an invalid code', async () => {
      mockVerifyOtp.mockResolvedValue({ error: new Error('Invalid code') });

      const result = await useAuthStore.getState().verifySignUpOtp('a@b.com', '000000');

      expect(result).toBe(false);
      expect(useAuthStore.getState().error).toBe('Invalid code');
    });
  });

  describe('resetPassword', () => {
    it('verifies the recovery code then updates the password on success', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      const result = await useAuthStore
        .getState()
        .resetPassword('a@b.com', '123456', 'newPassword123');

      expect(result).toBe(true);
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'a@b.com',
        token: '123456',
        type: 'recovery',
      });
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newPassword123' });
    });

    it('does not attempt to update the password if OTP verification fails', async () => {
      mockVerifyOtp.mockResolvedValue({ error: new Error('Invalid code') });

      const result = await useAuthStore
        .getState()
        .resetPassword('a@b.com', '000000', 'newPassword123');

      expect(result).toBe(false);
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(useAuthStore.getState().error).toBe('Invalid code');
    });
  });

  describe('signOut', () => {
    it('clears local session state and resets every domain store even if the request succeeds', async () => {
      useAuthStore.setState({ session, error: 'stale error', pendingRedirect: '/details/1' });
      mockSignOut.mockResolvedValue({ error: null });

      await useAuthStore.getState().signOut();

      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().error).toBeNull();
      expect(useAuthStore.getState().pendingRedirect).toBeNull();
      expect(mockListsReset).toHaveBeenCalled();
      expect(mockSharedListsReset).toHaveBeenCalled();
      expect(mockWatchLogReset).toHaveBeenCalled();
      expect(mockEpisodeProgressReset).toHaveBeenCalled();
      expect(mockProfileReset).toHaveBeenCalled();
      expect(mockRecommendationsReset).toHaveBeenCalled();
    });

    it('still clears local session state when the network request fails', async () => {
      // The store deliberately swallows this -- a network blip shouldn't
      // leave the user "stuck" signed in on their own device.
      useAuthStore.setState({ session });
      mockSignOut.mockRejectedValue(new Error('network down'));

      await useAuthStore.getState().signOut();

      expect(useAuthStore.getState().session).toBeNull();
    });
  });

  describe('pendingRedirect', () => {
    it('consumePendingRedirect returns and clears the stored path', () => {
      useAuthStore.getState().setPendingRedirect('/details/42?type=movie');

      expect(useAuthStore.getState().consumePendingRedirect()).toBe('/details/42?type=movie');
      expect(useAuthStore.getState().pendingRedirect).toBeNull();
    });

    it('consumePendingRedirect returns null when nothing was pending', () => {
      expect(useAuthStore.getState().consumePendingRedirect()).toBeNull();
    });
  });
});
