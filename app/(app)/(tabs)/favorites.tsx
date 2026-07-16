import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CARD_WIDTH,
  GRID_GAP,
  GRID_PADDING,
  MediaCardItem,
  MovieCard,
  getGridColumns,
  padGridRow,
} from '../../../components/home/MovieCard';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { useListsStore } from '../../../stores/lists.store';
import { dedupeWatchLog, useWatchLogStore } from '../../../stores/watchLog.store';

type Tab = 'favorites' | 'watchlist' | 'watched';

const TABS: Tab[] = ['favorites', 'watchlist', 'watched'];

const EMPTY_ICONS: Record<Tab, React.ComponentProps<typeof MaterialIcons>['name']> = {
  favorites: 'favorite-border',
  watchlist: 'bookmark-border',
  watched: 'history',
};

export default function FavoritesScreen() {
  const { t } = useTranslation();
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
    activeTab === 'favorites'
      ? isFavoritesLoading
      : activeTab === 'watchlist'
        ? isWatchlistLoading
        : isWatchedLoading;
  const error =
    activeTab === 'favorites'
      ? favoritesError
      : activeTab === 'watchlist'
        ? watchlistError
        : watchedError;
  const refetch =
    activeTab === 'favorites'
      ? fetchFavorites
      : activeTab === 'watchlist'
        ? fetchWatchlist
        : fetchWatchLog;

  const numColumns = getGridColumns(windowWidth);
  const gridData = useMemo(() => padGridRow(items, numColumns), [items, numColumns]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="gap-stack-md px-margin-mobile py-stack-md">
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
          {t('myList.title')}
        </Text>

        <View className="flex-row gap-2 rounded-full border border-glass-border bg-background-blur p-1">
          {TABS.map((tabKey) => {
            const isActive = tabKey === activeTab;
            return (
              <AnimatedPressable
                key={tabKey}
                onPress={() => setActiveTab(tabKey)}
                className={`flex-1 items-center rounded-full py-2 ${isActive ? 'bg-primary-container' : ''}`}
              >
                <Text
                  className={`font-sans-semibold text-body-md ${
                    isActive ? 'text-on-primary-container' : 'text-text-secondary'
                  }`}
                >
                  {t(`common.${tabKey}`)}
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
            <Text className="font-sans-semibold text-primary-container">
              {t('common.tryAgain')}
            </Text>
          </AnimatedPressable>
        </View>
      )}

      {!isLoading && !error && items.length === 0 && (
        <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
          <MaterialIcons name={EMPTY_ICONS[activeTab]} size={32} color="#A1A1AA" />
          <Text className="text-title-md font-sans-semibold text-text-primary">
            {t(`myList.empty.${activeTab}.title`)}
          </Text>
          <Text className="text-center font-sans text-body-md text-text-secondary">
            {t(`myList.empty.${activeTab}.subtitle`)}
          </Text>
        </View>
      )}

      {!error && items.length > 0 && (
        <FlatList
          key={numColumns}
          data={gridData}
          numColumns={numColumns}
          keyExtractor={(item, index) =>
            item ? `${item.mediaType}-${item.id}` : `filler-${index}`
          }
          renderItem={({ item, index }) =>
            item ? (
              <MovieCard item={item} index={index % numColumns} />
            ) : (
              <View style={{ width: CARD_WIDTH }} />
            )
          }
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
