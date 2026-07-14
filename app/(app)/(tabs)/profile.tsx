import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RegionPickerModal } from '../../../components/settings/RegionPickerModal';
import { ActionSheetModal } from '../../../components/ui/ActionSheetModal';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { BoringAvatar } from '../../../components/ui/BoringAvatar';
import { clearRecentSearches } from '../../../lib/storage/recentSearches';
import { WATCH_REGIONS } from '../../../lib/tmdb/regions';
import { useAuthStore } from '../../../stores/auth.store';
import { useListsStore } from '../../../stores/lists.store';
import { useProfileStore } from '../../../stores/profile.store';
import { useToastStore } from '../../../stores/toast.store';
import { dedupeWatchLog, useWatchLogStore } from '../../../stores/watchLog.store';

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

  const watchLogEntries = useWatchLogStore((state) => state.entries);
  const fetchWatchLog = useWatchLogStore((state) => state.fetchWatchLog);

  const profile = useProfileStore((state) => state.profile);
  const fetchProfile = useProfileStore((state) => state.fetchProfile);

  useEffect(() => {
    fetchFavorites();
    fetchWatchlist();
    fetchWatchLog();
    fetchProfile();
  }, [fetchFavorites, fetchWatchlist, fetchWatchLog, fetchProfile]);

  const email = session?.user?.email ?? '';
  const avatarSeed = profile?.avatarSeed || profile?.displayName || email;
  const memberSince = formatMemberSince(session?.user?.created_at);
  const favoritesCount = Object.keys(favorites).length;
  const watchlistCount = Object.keys(watchlist).length;
  const watchedCount = dedupeWatchLog(watchLogEntries).length;

  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] = useState(false);
  const [isRegionPickerOpen, setIsRegionPickerOpen] = useState(false);
  const watchRegionLabel = profile?.watchRegion
    ? (WATCH_REGIONS.find((region) => region.code === profile.watchRegion)?.name ??
      profile.watchRegion)
    : 'Device Default';

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
          <AnimatedPressable
            onPress={() => router.push('/edit-profile')}
            className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-glass-border"
          >
            <BoringAvatar name={avatarSeed} variant={profile?.avatarVariant ?? 'beam'} size={96} />
          </AnimatedPressable>
          <Text className="font-sans-semibold text-title-md text-text-primary">
            {profile?.displayName || email}
          </Text>
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
          <AnimatedPressable
            onPress={() => router.push({ pathname: '/favorites', params: { tab: 'watched' } })}
            className="flex-1 items-center gap-1 rounded-xl border border-glass-border bg-surface-container-low py-stack-md"
          >
            <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
              {watchedCount}
            </Text>
            <Text className="font-sans text-caption text-text-secondary">Watched</Text>
          </AnimatedPressable>
        </View>

        <View className="mb-section-gap px-margin-mobile">
          <View className="overflow-hidden rounded-xl border border-glass-border bg-surface-container-low">
            <AnimatedPressable
              onPress={() => router.push('/stats')}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="bar-chart" size={20} color="#A1A1AA" />
              <Text className="flex-1 font-sans text-body-md text-text-primary">Statistics</Text>
              <MaterialIcons name="chevron-right" size={20} color="#A1A1AA" />
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
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
              onPress={() => router.push('/import')}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="file-upload" size={20} color="#A1A1AA" />
              <Text className="flex-1 font-sans text-body-md text-text-primary">
                Import from TV Time / Letterboxd
              </Text>
              <MaterialIcons name="chevron-right" size={20} color="#A1A1AA" />
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={() => setIsRegionPickerOpen(true)}
              className="flex-row items-center gap-3 px-4 py-stack-md"
            >
              <MaterialIcons name="public" size={20} color="#A1A1AA" />
              <Text className="flex-1 font-sans text-body-md text-text-primary">Watch Region</Text>
              <Text className="font-sans text-caption text-text-secondary">{watchRegionLabel}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#A1A1AA" />
            </AnimatedPressable>
            <View className="h-px bg-glass-border" />
            <AnimatedPressable
              onPress={() => setIsClearHistoryConfirmOpen(true)}
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
          {Constants.expoConfig?.name ?? 'Previously'} v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>

        {/* TMDB API terms require this attribution notice. */}
        <Pressable
          onPress={() =>
            Linking.openURL('https://www.themoviedb.org/').catch(() => {
              useToastStore.getState().show('Could not open link', 'error-outline');
            })
          }
          className="mt-stack-sm px-margin-mobile"
        >
          <Text className="text-center font-sans text-caption text-text-secondary">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </Text>
          <Text
            className="mt-1 text-center font-sans-semibold text-caption"
            style={{ color: '#01b4e4' }}
          >
            themoviedb.org
          </Text>
        </Pressable>
      </ScrollView>

      <ActionSheetModal
        visible={isClearHistoryConfirmOpen}
        title="Clear Search History"
        message="This will remove all your recent searches."
        onClose={() => setIsClearHistoryConfirmOpen(false)}
        actions={[{ label: 'Clear', destructive: true, onPress: () => clearRecentSearches() }]}
      />

      <RegionPickerModal
        visible={isRegionPickerOpen}
        onClose={() => setIsRegionPickerOpen(false)}
      />
    </SafeAreaView>
  );
}
