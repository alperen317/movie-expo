import { api } from './client';

export interface TokenResponse {
  accessToken: string;
  expiresAt: string;
  refreshToken: string;
}

// Always 202/204 regardless of whether the address is registered/pending/
// taken -- the server deliberately gives no signal either way, so there is
// nothing more specific for these to return.

export function register(email: string, password: string): Promise<void> {
  return api.post('/auth/register', { email, password });
}

export function resendVerification(email: string): Promise<void> {
  return api.post('/auth/resend-verification', { email });
}

export function verifyEmail(email: string, code: string): Promise<TokenResponse> {
  return api.post('/auth/verify-email', { email, code });
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return api.post('/auth/login', { email, password });
}

export function refresh(refreshToken: string): Promise<TokenResponse> {
  return api.post('/auth/refresh', { refreshToken });
}

export function logout(refreshToken: string): Promise<void> {
  return api.post('/auth/logout', { refreshToken });
}

export function forgotPassword(email: string): Promise<void> {
  return api.post('/auth/forgot-password', { email });
}

export function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  return api.post('/auth/reset-password', { email, code, newPassword });
}
