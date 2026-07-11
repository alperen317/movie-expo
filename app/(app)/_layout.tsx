import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';

import { Toast } from '../../components/ui/Toast';
import { useAuthStore } from '../../stores/auth.store';
import { useListsStore } from '../../stores/lists.store';

export default function AppLayout() {
  const session = useAuthStore((state) => state.session);

  useEffect(() => {
    useListsStore.getState().fetchFavorites();
    useListsStore.getState().fetchWatchlist();
  }, []);

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
      </Stack>
      <Toast />
    </>
  );
}
