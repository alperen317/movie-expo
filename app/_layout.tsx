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
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { applyStoredLanguagePreference } from '../lib/i18n';
import { applyStoredThemePreference } from '../lib/theme/themePreference';
import { supabase } from '../lib/supabase/client';
import { initSentry } from '../lib/telemetry/sentry';
import { useAuthStore } from '../stores/auth.store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const [arePrefsReady, setArePrefsReady] = useState(false);
  const { colorScheme } = useColorScheme();
  const isReady = fontsLoaded && !isAuthLoading && arePrefsReady;

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
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="forgot-password" />
      </Stack>
      <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
    </SafeAreaProvider>
  );
}
