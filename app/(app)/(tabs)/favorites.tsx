import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CARD_WIDTH, MediaCardItem, MovieCard } from '../../../components/home/MovieCard';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { useListsStore } from '../../../stores/lists.store';
import { dedupeWatchLog, useWatchLogStore } from '../../../stores/watchLog.store';

const GRID_GAP = 16;
const GRID_PADDING = 16;

type Tab = 'favorites' | 'watchlist' | 'watched';

const TABS: { key: Tab; label: string }[] = [
  { key: 'favorites', label: 'Favorites' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'watched', label: 'Watched' },
];

const EMPTY_STATE: Record<Tab, { icon: React.ComponentProps<typeof MaterialIcons>['name']; title: string; subtitle: string }> = {
  favorites: {
    icon: 'favorite-border',
    title: 'No favorites yet',
    subtitle: 'Tap the heart icon on a title to add it here.',
  },
  watchlist: {
    icon: 'bookmark-border',
    title: 'Your watchlist is empty',
    subtitle: 'Tap "Add to Watchlist" on a title to save it for later.',
  },
  watched: {
    icon: 'history',
    title: 'No watched titles yet',
    subtitle: 'Mark a title as watched from its details page to see it here.',
  },
};

export default function FavoritesScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<Tab>(
    tab === 'watchlist' || tab === 'watched' ? tab : 'favorites',
  );
  const { width: windowWidth } = useWindowDimensions();

  const favorites = useListsStore((state) => state.favorites);
  const isFavoritesLoading = useListsStore((state) => state.isFavoritesLoading);
  const favoritesError = useListsStore((state) => state.favoritesError);
  const fetchFavorites = useListsStore((state) => state.fetchFavorites);

  const watchlist = useListsStore((state) => state.watchlist);
  const isWatchlistLoading = useListsStore((state) => state.isWatchlistLoading);
  const watchlistError = useListsStore((state) => state.watchlistError);
  const fetchWatchlist = useListsStore((state) => state.fetchWatchlist);

  const watchLogEntries = useWatchLogStore((state) => state.entries);
  const isWatchedLoading = useWatchLogStore((state) => state.isLoading);
  const watchedError = useWatchLogStore((state) => state.error);
  const fetchWatchLog = useWatchLogStore((state) => state.fetchWatchLog);

  const items = useMemo((): MediaCardItem[] => {
    if (activeTab === 'favorites') {
      return Object.values(favorites).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    }
    if (activeTab === 'watchlist') {
      return Object.values(watchlist).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    }
    return dedupeWatchLog(watchLogEntries);
  }, [activeTab, favorites, watchlist, watchLogEntries]);

  const isLoading =
    activeTab === 'favorites' ? isFavoritesLoading : activeTab === 'watchlist' ? isWatchlistLoading : isWatchedLoading;
  const error = activeTab === 'favorites' ? favoritesError : activeTab === 'watchlist' ? watchlistError : watchedError;
  const refetch = activeTab === 'favorites' ? fetchFavorites : activeTab === 'watchlist' ? fetchWatchlist : fetchWatchLog;

  const numColumns = Math.max(
    2,
    Math.floor((windowWidth - GRID_PADDING * 2 + GRID_GAP) / (CARD_WIDTH + GRID_GAP)),
  );

  const emptyState = EMPTY_STATE[activeTab];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="gap-stack-md px-margin-mobile py-stack-md">
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">My List</Text>

        <View className="flex-row gap-2 rounded-full border border-glass-border bg-background-blur p-1">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <AnimatedPressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`flex-1 items-center rounded-full py-2 ${isActive ? 'bg-primary-container' : ''}`}
              >
                <Text
                  className={`font-sans-semibold text-body-md ${
                    isActive ? 'text-on-primary-container' : 'text-text-secondary'
                  }`}
                >
                  {tab.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      {isLoading && items.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      )}

      {error && !isLoading && (
        <View className="flex-1 items-center justify-center gap-stack-md px-margin-mobile">
          <Text className="text-center font-sans text-body-md text-text-primary">{error}</Text>
          <AnimatedPressable
            onPress={refetch}
            className="rounded-full border border-glass-border bg-background-blur px-6 py-3"
          >
            <Text className="font-sans-semibold text-primary-container">Try Again</Text>
          </AnimatedPressable>
        </View>
      )}

      {!isLoading && !error && items.length === 0 && (
        <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
          <MaterialIcons name={emptyState.icon} size={32} color="#A1A1AA" />
          <Text className="text-title-md font-sans-semibold text-text-primary">
            {emptyState.title}
          </Text>
          <Text className="text-center font-sans text-body-md text-text-secondary">
            {emptyState.subtitle}
          </Text>
        </View>
      )}

      {!error && items.length > 0 && (
        <FlatList
          key={numColumns}
          data={items}
          numColumns={numColumns}
          keyExtractor={(item) => `${item.mediaType}-${item.id}`}
          renderItem={({ item, index }) => <MovieCard item={item} index={index % numColumns} />}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: GRID_GAP }}
          contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </SafeAreaView>
  );
}
