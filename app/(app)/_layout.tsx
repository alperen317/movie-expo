import { Redirect, Stack, usePathname, useGlobalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { Toast } from '../../components/ui/Toast';
import { scheduleUpcomingEpisodeReminders } from '../../lib/notifications/episodeReminders';
import { useAuthStore } from '../../stores/auth.store';
import { useEpisodeProgressStore } from '../../stores/episodeProgress.store';
import { useListsStore } from '../../stores/lists.store';
import { useProfileStore } from '../../stores/profile.store';
import { useWatchLogStore } from '../../stores/watchLog.store';

export default function AppLayout() {
  const session = useAuthStore((state) => state.session);
  const pathname = usePathname();
  const searchParams = useGlobalSearchParams<Record<string, string>>();

  useEffect(() => {
    useListsStore.getState().fetchFavorites();
    useListsStore.getState().fetchWatchlist();
    useWatchLogStore.getState().fetchWatchLog();
    useProfileStore.getState().fetchProfile();
    useEpisodeProgressStore
      .getState()
      .fetchProgress()
      .then(() => scheduleUpcomingEpisodeReminders());
  }, []);

  useEffect(() => {
    // Preserves a cold-started deep link (e.g. previously://details/123) so
    // the login screen can send the user there after they sign in, instead
    // of always landing on the home tab.
    if (!session) {
      const query = new URLSearchParams(searchParams).toString();
      useAuthStore.getState().setPendingRedirect(query ? `${pathname}?${query}` : pathname);
    }
  }, [session, pathname, searchParams]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="details/[id]" options={{ animation: 'fade' }} />
        <Stack.Screen name="actor/[id]" options={{ animation: 'fade' }} />
        <Stack.Screen name="lists/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="lists/add-items" options={{ presentation: 'modal' }} />
        <Stack.Screen name="join/[code]" options={{ animation: 'fade' }} />
        <Stack.Screen name="calendar" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="stats" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="import" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="legal/privacy" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="legal/terms" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <Toast />
    </>
  );
}
