import {
  forgotPassword,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '../lib/api/auth';
import { loadRememberPreference, setRememberPreference } from '../lib/api/authStorage';
import { ensureValidToken, onSessionExpired } from '../lib/api/client';
import { stopRealtimeConnection } from '../lib/api/realtime';
import {
  clearTokens,
  currentTokens,
  decodeUserId,
  loadTokens,
  saveTokens,
} from '../lib/api/tokenStore';
import { useAuthStore, type Session } from './auth.store';

// jest.fn()s are created *inside* each factory rather than referenced from an
// outer `const mock... = jest.fn()`: import hoisting runs those factories
// before top-level consts in this file are assigned, so an eagerly-evaluated
// property (`resetPassword: mockResetPasswordRequest`) would capture
// `undefined`. Grabbing the reference back through the (now mocked) import
// binding after the fact sidesteps the ordering problem entirely.
jest.mock('../lib/api/auth', () => ({
  register: jest.fn(),
  resendVerification: jest.fn(),
  verifyEmail: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
}));

jest.mock('../lib/api/authStorage', () => ({
  loadRememberPreference: jest.fn(),
  setRememberPreference: jest.fn(),
}));

jest.mock('../lib/api/client', () => ({
  ensureValidToken: jest.fn(),
  onSessionExpired: jest.fn(),
}));

jest.mock('../lib/api/tokenStore', () => ({
  clearTokens: jest.fn(),
  currentTokens: jest.fn(),
  decodeUserId: jest.fn(),
  loadTokens: jest.fn(),
  saveTokens: jest.fn(),
}));

jest.mock('../lib/api/realtime', () => ({
  stopRealtimeConnection: jest.fn(),
}));

const mockRegister = register as jest.Mock;
const mockResendVerification = resendVerification as jest.Mock;
const mockVerifyEmail = verifyEmail as jest.Mock;
const mockLogin = login as jest.Mock;
const mockLogout = logout as jest.Mock;
const mockForgotPassword = forgotPassword as jest.Mock;
const mockResetPasswordRequest = resetPassword as jest.Mock;
const mockLoadRememberPreference = loadRememberPreference as jest.Mock;
const mockSetRememberPreference = setRememberPreference as jest.Mock;
const mockEnsureValidToken = ensureValidToken as jest.Mock;
const mockOnSessionExpired = onSessionExpired as jest.Mock;
const mockStopRealtimeConnection = stopRealtimeConnection as jest.Mock;
const mockClearTokens = clearTokens as jest.Mock;
const mockCurrentTokens = currentTokens as jest.Mock;
const mockDecodeUserId = decodeUserId as jest.Mock;
const mockLoadTokens = loadTokens as jest.Mock;
const mockSaveTokens = saveTokens as jest.Mock;

// The "mock" name prefix is what lets these be referenced from inside the
// jest.mock() factories below -- unlike the eager properties above, each one
// here sits behind a `getState: () => ({...})` closure that isn't invoked
// until well after this file's top-level consts have run, so the ordering
// problem doesn't apply to them.
const mockEpisodeProgressReset = jest.fn();
const mockListsReset = jest.fn();
const mockProfileReset = jest.fn();
const mockRecommendationsReset = jest.fn();
const mockSharedListsReset = jest.fn();
const mockSharedListsFetchPendingInvites = jest.fn();
const mockWatchLogReset = jest.fn();

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

const tokens = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresAt: '2099-01-01T00:00:00Z',
};
const session: Session = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresAt: '2099-01-01T00:00:00Z',
  userId: 'user-1',
};

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

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
    mockLoadRememberPreference.mockResolvedValue(undefined);
    mockSaveTokens.mockResolvedValue(undefined);
    mockClearTokens.mockResolvedValue(undefined);
    mockStopRealtimeConnection.mockResolvedValue(undefined);
    mockDecodeUserId.mockReturnValue('user-1');
  });

  describe('signIn', () => {
    it('persists the remember-me preference before signing in and stores the returned session', async () => {
      mockLogin.mockResolvedValue(tokens);

      await useAuthStore.getState().signIn('a@b.com', 'password123', true);

      expect(mockSetRememberPreference).toHaveBeenCalledWith(true);
      expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'password123');
      expect(mockSaveTokens).toHaveBeenCalledWith({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        accessTokenExpiresAt: '2099-01-01T00:00:00Z',
      });
      expect(useAuthStore.getState().session).toEqual(session);
      expect(useAuthStore.getState().isSubmitting).toBe(false);
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('sets an error message and clears isSubmitting when sign-in fails', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      await useAuthStore.getState().signIn('a@b.com', 'wrong', false);

      expect(useAuthStore.getState().error).toBe('Invalid credentials');
      expect(useAuthStore.getState().isSubmitting).toBe(false);
      expect(useAuthStore.getState().session).toBeNull();
    });
  });

  describe('signUp', () => {
    it('resets the remember-me preference to persist before signing up', async () => {
      // Otherwise a fresh account created right after an opted-out session
      // would silently inherit that in-memory-only policy -- there's no
      // "remember me" toggle on this screen for the user to fix it with.
      mockRegister.mockResolvedValue(undefined);

      await useAuthStore.getState().signUp('a@b.com', 'password123');

      expect(mockSetRememberPreference).toHaveBeenCalledWith(true);
      expect(mockRegister).toHaveBeenCalledWith('a@b.com', 'password123');
    });

    it('always flags needsEmailConfirmation on success -- the server never signs an account in before its email is confirmed', async () => {
      mockRegister.mockResolvedValue(undefined);

      await useAuthStore.getState().signUp('a@b.com', 'password123');

      expect(useAuthStore.getState().needsEmailConfirmation).toBe(true);
      expect(useAuthStore.getState().isSubmitting).toBe(false);
    });

    it('sets an error message and clears isSubmitting when sign-up fails', async () => {
      mockRegister.mockRejectedValue(new Error('Email already registered'));

      await useAuthStore.getState().signUp('a@b.com', 'password123');

      expect(useAuthStore.getState().error).toBe('Email already registered');
      expect(useAuthStore.getState().isSubmitting).toBe(false);
    });
  });

  describe('verifySignUpOtp', () => {
    it('returns true, clears needsEmailConfirmation and stores the session on a valid code', async () => {
      useAuthStore.setState({ needsEmailConfirmation: true });
      mockVerifyEmail.mockResolvedValue(tokens);

      const result = await useAuthStore.getState().verifySignUpOtp('a@b.com', '123456');

      expect(result).toBe(true);
      expect(useAuthStore.getState().needsEmailConfirmation).toBe(false);
      expect(useAuthStore.getState().session).toEqual(session);
    });

    it('returns false and sets an error on an invalid code', async () => {
      mockVerifyEmail.mockRejectedValue(new Error('Invalid code'));

      const result = await useAuthStore.getState().verifySignUpOtp('a@b.com', '000000');

      expect(result).toBe(false);
      expect(useAuthStore.getState().error).toBe('Invalid code');
      expect(useAuthStore.getState().session).toBeNull();
    });
  });

  describe('resendSignUpOtp', () => {
    it('returns true on success', async () => {
      mockResendVerification.mockResolvedValue(undefined);

      const result = await useAuthStore.getState().resendSignUpOtp('a@b.com');

      expect(result).toBe(true);
      expect(mockResendVerification).toHaveBeenCalledWith('a@b.com');
    });

    it('returns false and sets an error on failure', async () => {
      mockResendVerification.mockRejectedValue(new Error('Too many requests'));

      const result = await useAuthStore.getState().resendSignUpOtp('a@b.com');

      expect(result).toBe(false);
      expect(useAuthStore.getState().error).toBe('Too many requests');
    });
  });

  describe('requestPasswordReset', () => {
    it('returns true on success', async () => {
      mockForgotPassword.mockResolvedValue(undefined);

      const result = await useAuthStore.getState().requestPasswordReset('a@b.com');

      expect(result).toBe(true);
      expect(mockForgotPassword).toHaveBeenCalledWith('a@b.com');
    });

    it('returns false and sets an error on failure', async () => {
      mockForgotPassword.mockRejectedValue(new Error('network down'));

      const result = await useAuthStore.getState().requestPasswordReset('a@b.com');

      expect(result).toBe(false);
      expect(useAuthStore.getState().error).toBe('network down');
    });
  });

  describe('resetPassword', () => {
    it('spends the reset code then signs in with the new password', async () => {
      // Unlike the old Supabase flow, spending the code alone doesn't return
      // a session -- the store signs in right after to establish one.
      mockResetPasswordRequest.mockResolvedValue(undefined);
      mockLogin.mockResolvedValue(tokens);

      const result = await useAuthStore
        .getState()
        .resetPassword('a@b.com', '123456', 'newPassword123');

      expect(result).toBe(true);
      expect(mockResetPasswordRequest).toHaveBeenCalledWith('a@b.com', '123456', 'newPassword123');
      expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'newPassword123');
      expect(useAuthStore.getState().session).toEqual(session);
    });

    it('does not attempt to sign in if the reset code is rejected', async () => {
      mockResetPasswordRequest.mockRejectedValue(new Error('Invalid code'));

      const result = await useAuthStore
        .getState()
        .resetPassword('a@b.com', '000000', 'newPassword123');

      expect(result).toBe(false);
      expect(mockLogin).not.toHaveBeenCalled();
      expect(useAuthStore.getState().error).toBe('Invalid code');
    });
  });

  describe('signOut', () => {
    it('clears local session state and resets every domain store even if the request succeeds', async () => {
      mockCurrentTokens.mockReturnValue({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        accessTokenExpiresAt: '2099-01-01T00:00:00Z',
      });
      useAuthStore.setState({ session, error: 'stale error', pendingRedirect: '/details/1' });
      mockLogout.mockResolvedValue(undefined);

      await useAuthStore.getState().signOut();

      expect(mockLogout).toHaveBeenCalledWith('refresh-1');
      expect(mockClearTokens).toHaveBeenCalled();
      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().error).toBeNull();
      expect(useAuthStore.getState().pendingRedirect).toBeNull();
      expect(mockListsReset).toHaveBeenCalled();
      expect(mockSharedListsReset).toHaveBeenCalled();
      expect(mockWatchLogReset).toHaveBeenCalled();
      expect(mockEpisodeProgressReset).toHaveBeenCalled();
      expect(mockProfileReset).toHaveBeenCalled();
      expect(mockRecommendationsReset).toHaveBeenCalled();
      expect(mockStopRealtimeConnection).toHaveBeenCalled();
    });

    it('still clears local session state when the network request fails', async () => {
      // The store deliberately swallows this -- a network blip shouldn't
      // leave the user "stuck" signed in on their own device.
      mockCurrentTokens.mockReturnValue({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        accessTokenExpiresAt: '2099-01-01T00:00:00Z',
      });
      useAuthStore.setState({ session });
      mockLogout.mockRejectedValue(new Error('network down'));

      await useAuthStore.getState().signOut();

      expect(useAuthStore.getState().session).toBeNull();
      expect(mockClearTokens).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('sets isLoading false with no session when nothing is stored', async () => {
      mockLoadTokens.mockResolvedValue(null);

      useAuthStore.getState().initialize();
      await flushMicrotasks();

      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('restores the session from a still-valid stored token', async () => {
      const stored = {
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        accessTokenExpiresAt: '2099-01-01T00:00:00Z',
      };
      mockLoadTokens.mockResolvedValue(stored);
      mockEnsureValidToken.mockResolvedValue('access-1');
      mockCurrentTokens.mockReturnValue(stored);

      useAuthStore.getState().initialize();
      await flushMicrotasks();

      expect(useAuthStore.getState().session).toEqual(session);
      expect(useAuthStore.getState().isLoading).toBe(false);
      // Populates the Listeler tab badge on cold start, before the user ever
      // opens that tab.
      expect(mockSharedListsFetchPendingInvites).toHaveBeenCalled();
    });

    it('clears the session when a stored token cannot be refreshed', async () => {
      mockLoadTokens.mockResolvedValue({
        accessToken: 'stale',
        refreshToken: 'refresh-1',
        accessTokenExpiresAt: '2000-01-01T00:00:00Z',
      });
      mockEnsureValidToken.mockResolvedValue(null);

      useAuthStore.getState().initialize();
      await flushMicrotasks();

      expect(mockClearTokens).toHaveBeenCalled();
      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('registers a session-expiry listener that clears local state and resets every domain store', async () => {
      mockLoadTokens.mockResolvedValue(null);

      useAuthStore.getState().initialize();
      await flushMicrotasks();

      const listener = mockOnSessionExpired.mock.calls[0][0] as () => void;
      useAuthStore.setState({ session, error: 'stale', pendingRedirect: '/x' });

      listener();

      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().error).toBeNull();
      expect(useAuthStore.getState().pendingRedirect).toBeNull();
      expect(mockListsReset).toHaveBeenCalled();
      expect(mockSharedListsReset).toHaveBeenCalled();
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
