import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { clearRecentSearches } from '../../../lib/storage/recentSearches';
import { getInitials } from '../../../lib/utils/initials';
import { useAuthStore } from '../../../stores/auth.store';
import { useListsStore } from '../../../stores/lists.store';

function formatMemberSince(dateString?: string): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function ProfileScreen() {
  const { height: windowHeight } = useWindowDimensions();

  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);

  const favorites = useListsStore((state) => state.favorites);
  const watchlist = useListsStore((state) => state.watchlist);
  const fetchFavorites = useListsStore((state) => state.fetchFavorites);
  const fetchWatchlist = useListsStore((state) => state.fetchWatchlist);

  useEffect(() => {
    fetchFavorites();
    fetchWatchlist();
  }, [fetchFavorites, fetchWatchlist]);

  const email = session?.user?.email ?? '';
  const initials = getInitials(email);
  const memberSince = formatMemberSince(session?.user?.created_at);
  const favoritesCount = Object.keys(favorites).length;
  const watchlistCount = Object.keys(watchlist).length;

  const handleClearHistory = () => {
    Alert.alert('Clear Search History', 'This will remove all your recent searches.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearRecentSearches() },
    ]);
  };

  const handleSignOut = () => {
    // NOTE: React Native's Alert.alert is unsupported on web (renders nothing),
    // so gating sign-out behind it makes the button appear dead in the web build.
    // Sign out directly for a reliable cross-platform flow.
    signOut();
  };

  return (
    <SafeAreaView edges={['top']} style={{ height: windowHeight }} className="bg-background">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-margin-mobile pb-stack-md pt-stack-sm">
          <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">Profile</Text>
        </View>

        <View className="items-center gap-stack-sm px-margin-mobile pb-section-gap">
          <View className="h-24 w-24 items-center justify-center rounded-full border border-glass-border bg-surface-container-low">
            <Text className="text-headline-lg-mobile font-sans-bold text-primary-container">
              {initials}
            </Text>
          </View>
          <Text className="font-sans-semibold text-title-md text-text-primary">{email}</Text>
          {memberSince.length > 0 && (
            <Text className="font-sans text-body-md text-text-secondary">
              Member since {memberSince}
            </Text>
          )}
        </View>

        <View className="mb-section-gap flex-row gap-gutter px-margin-mobile">
          <AnimatedPressable
            onPress={() => router.push({ pathname: '/favorites', params: { tab: 'favorites' } })}
            className="flex-1 items-center gap-1 rounded-xl border border-glass-border bg-surface-container-low py-stack-md"
          >
            <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
              {favoritesCount}
            </Text>
            <Text className="font-sans text-caption text-text-secondary">Favorites</Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => router.push({ pathname: '/favorites', params: { tab: 'watchlist' } })}
            className="flex-1 items-center gap-1 rounded-xl border border-glass-border bg-surface-container-low py-stack-md"
          >
            <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
              {watchlistCount}
            </Text>
            <Text className="font-sans text-caption text-text-secondary">Watchlist</Text>
          </AnimatedPressable>
        </View>

        <View className="mb-section-gap px-margin-mobile">
          <View className="overflow-hidden rounded-xl border border-glass-border bg-surface-container-low">
            <AnimatedPressable
              onPress={() => router.push('/calendar')}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="calendar-today" size={20} color="#A1A1AA" />
              <Text className="flex-1 font-sans text-body-md text-text-primary">
                Upcoming Episodes
              </Text>
              <MaterialIcons name="chevron-right" size={20} color="#A1A1AA" />
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={handleClearHistory}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="history" size={20} color="#A1A1AA" />
              <Text className="flex-1 font-sans text-body-md text-text-primary">
                Clear Search History
              </Text>
              <MaterialIcons name="chevron-right" size={20} color="#A1A1AA" />
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={handleSignOut}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="logout" size={20} color="#ffb4ab" />
              <Text className="flex-1 font-sans text-body-md text-error">Sign Out</Text>
            </AnimatedPressable>
          </View>
        </View>

        <Text className="text-center font-sans text-caption text-text-secondary">
          CineLux v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
