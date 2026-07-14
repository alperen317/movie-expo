import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

const CRASH_REPORTING_KEY = 'previously:crash-reporting-enabled';

// Opt-out, not opt-in: enabled by default unless the user has explicitly
// turned it off in Profile.
export async function isCrashReportingEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(CRASH_REPORTING_KEY);
  return stored !== 'false';
}

export async function setCrashReportingEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(CRASH_REPORTING_KEY, enabled ? 'true' : 'false');
  if (!enabled) {
    // Stops sending immediately. Re-enabling needs a fresh Sentry.init, which
    // only happens on next launch -- see the toast in profile.tsx.
    Sentry.close();
  }
}

// No-ops entirely if EXPO_PUBLIC_SENTRY_DSN isn't set (see .env.example).
export async function initSentry(): Promise<void> {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const enabled = await isCrashReportingEnabled();
  if (!enabled) return;

  Sentry.init({ dsn, tracesSampleRate: 0.2 });
}
