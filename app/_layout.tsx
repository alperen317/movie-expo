import '../global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SplashVideo } from '../components/splash/SplashVideo';
import { AppErrorBoundary } from '../components/ui/AppErrorBoundary';
import { applyStoredLanguagePreference } from '../lib/i18n';
import { applyStoredThemePreference } from '../lib/theme/themePreference';
import { supabase } from '../lib/supabase/client';
import { initSentry } from '../lib/telemetry/sentry';
import { useAuthStore } from '../stores/auth.store';
import { useSharedListsStore } from '../stores/sharedLists.store';

SplashScreen.preventAutoHideAsync();

// expo-router renders a route's `ErrorBoundary` export in place of that route
// when its render throws. Exported from the root layout, it covers the whole
// app: without it a single bad render is a blank screen with no way out.
export { AppErrorBoundary as ErrorBoundary };

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const [arePrefsReady, setArePrefsReady] = useState(false);
  const [isIntroDone, setIsIntroDone] = useState(false);
  const { colorScheme } = useColorScheme();
  const isReady = fontsLoaded && !isAuthLoading && arePrefsReady;
  const handleIntroFinish = useCallback(() => setIsIntroDone(true), []);

  useEffect(() => {
    useAuthStore.getState().initialize();
    initSentry();
    // Apply the saved language and theme overrides before revealing the UI so a
    // stored choice that differs from the device default doesn't flash first.
    Promise.all([applyStoredLanguagePreference(), applyStoredThemePreference()]).finally(() =>
      setArePrefsReady(true),
    );

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
        // The realtime WebSocket drops easily while backgrounded; silently
        // resync whatever list screen is open and refresh the pending-invite
        // badge count rather than waiting for the user to leave and re-enter.
        useSharedListsStore.getState().refreshActiveList();
        useSharedListsStore.getState().fetchPendingInvites();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => subscription.remove();
  }, []);

  // Hand the native splash over to the video overlay as soon as JS is running,
  // not when everything is ready: both are painted on the same background
  // colour so the swap has no visible seam, and this way the clip plays *while*
  // fonts/auth/preferences load behind it instead of adding 2.5s on top.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      {/* Mounted behind the overlay so the first screen is warm by the time the
          intro clears. Still gated on isReady: a stored language/theme must be
          applied before any UI renders, or the wrong one flashes first. */}
      {isReady && (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(app)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="forgot-password" />
        </Stack>
      )}
      {!(isReady && isIntroDone) && <SplashVideo onFinish={handleIntroFinish} />}
      <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
    </SafeAreaProvider>
  );
}
