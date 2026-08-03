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

// A trail of what the user was doing leading up to a crash, not a standalone
// analytics event: breadcrumbs only surface attached to a captured
// exception (or manually in Sentry's UI), and Sentry.addBreadcrumb is a
// no-op when the SDK was never initialized (no DSN) or has been closed
// (crash reporting opted out), so callers don't need to guard on that
// themselves. Keep `data` to plain values -- never the free-text a user
// typed (a search query, an import file name) -- since this ships to a
// third party.
export function logBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, string | number | boolean>,
): void {
  Sentry.addBreadcrumb({ category, message, level: 'info', data });
}
