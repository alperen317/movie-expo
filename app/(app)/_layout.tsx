import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { Toast } from '../../components/ui/Toast';
import { useListsStore } from '../../stores/lists.store';

export default function AppLayout() {
  useEffect(() => {
    useListsStore.getState().fetchFavorites();
    useListsStore.getState().fetchWatchlist();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="details/[id]" options={{ animation: 'fade' }} />
        <Stack.Screen name="actor/[id]" options={{ animation: 'fade' }} />
      </Stack>
      <Toast />
    </>
  );
}
