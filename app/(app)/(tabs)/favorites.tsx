import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { ActionSheetModal } from '../../../components/ui/ActionSheetModal';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { MediaFilterBar } from '../../../components/ui/MediaFilterBar';
import { useMediaTypeGenreFilter } from '../../../lib/hooks/useMediaTypeGenreFilter';
import { useThemeColors } from '../../../lib/theme/useThemeColors';
import { useListsStore } from '../../../stores/lists.store';
import { dedupeWatchLog, useWatchLogStore } from '../../../stores/watchLog.store';

type Tab = 'favorites' | 'watchlist' | 'watched';

const TABS: Tab[] = ['favorites', 'watchlist', 'watched'];

const EMPTY_ICONS: Record<Tab, React.ComponentProps<typeof MaterialIcons>['name']> = {
  favorites: 'favorite-border',
  watchlist: 'bookmark-border',
  watched: 'history',
};

type SortOption = 'recent' | 'oldest' | 'title' | 'rating' | 'year';

const SORT_LABEL_KEYS: Record<SortOption, string> = {
  recent: 'myList.sortRecent',
  oldest: 'myList.sortOldest',
  title: 'myList.sortTitle',
  rating: 'myList.sortRating',
  year: 'myList.sortYear',
};

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
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

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('recent');

  // Carry the tab-specific "when did this land here" date through as sortDate
  // so recent/oldest sorting works uniformly across all three tabs.
  const items = useMemo((): (MediaCardItem & { sortDate: string })[] => {
    if (activeTab === 'favorites') {
      return Object.values(favorites).map((item) => ({ ...item, sortDate: item.savedAt }));
    }
    if (activeTab === 'watchlist') {
      return Object.values(watchlist).map((item) => ({ ...item, sortDate: item.savedAt }));
    }
    return dedupeWatchLog(watchLogEntries).map((item) => ({ ...item, sortDate: item.watchedAt }));
  }, [activeTab, favorites, watchlist, watchLogEntries]);

  const {
    mediaTypeFilter,
    setMediaTypeFilter,
    genreFilter,
    setGenreFilter,
    availableGenres,
    filteredItems,
    clearFilters,
  } = useMediaTypeGenreFilter(items);

  // Each tab has its own genre universe; a filter picked on one tab would
  // silently blank out another.
  useEffect(() => {
    clearFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      switch (sortOption) {
        case 'recent':
          return b.sortDate.localeCompare(a.sortDate);
        case 'oldest':
          return a.sortDate.localeCompare(b.sortDate);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'rating':
          return b.voteAverage - a.voteAverage;
        case 'year':
          return (b.year ?? '').localeCompare(a.year ?? '');
        default:
          return 0;
      }
    });
  }, [filteredItems, sortOption]);

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
  const gridData = useMemo(() => padGridRow(sortedItems, numColumns), [sortedItems, numColumns]);

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
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
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

        {items.length > 0 && (
          <MediaFilterBar
            mediaTypeFilter={mediaTypeFilter}
            onMediaTypeFilterChange={setMediaTypeFilter}
            genreFilter={genreFilter}
            onGenreFilterChange={setGenreFilter}
            availableGenres={availableGenres}
            rightAccessory={
              <AnimatedPressable
                onPress={() => setIsSortOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.openSortMenu')}
                className="h-9 flex-row items-center gap-1 rounded-full border border-glass-border bg-surface-container-low px-3"
              >
                <MaterialIcons name="sort" size={16} color={colors.textSecondary} />
                <Text className="font-sans-semibold text-caption text-text-secondary">
                  {t(SORT_LABEL_KEYS[sortOption])}
                </Text>
              </AnimatedPressable>
            }
          />
        )}
      </View>

      {isLoading && items.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.textPrimary} />
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
          <MaterialIcons name={EMPTY_ICONS[activeTab]} size={32} color={colors.icon} />
          <Text className="text-title-md font-sans-semibold text-text-primary">
            {t(`myList.empty.${activeTab}.title`)}
          </Text>
          <Text className="text-center font-sans text-body-md text-text-secondary">
            {t(`myList.empty.${activeTab}.subtitle`)}
          </Text>
        </View>
      )}

      {!error && items.length > 0 && sortedItems.length === 0 && (
        <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
          <MaterialIcons name="filter-alt-off" size={32} color={colors.icon} />
          <Text className="text-title-md font-sans-semibold text-text-primary">
            {t('common.noFilterMatches')}
          </Text>
          <AnimatedPressable
            onPress={clearFilters}
            className="rounded-full border border-glass-border bg-background-blur px-6 py-3"
          >
            <Text className="font-sans-semibold text-primary-container">
              {t('common.clearFilters')}
            </Text>
          </AnimatedPressable>
        </View>
      )}

      {!error && sortedItems.length > 0 && (
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

      <ActionSheetModal
        visible={isSortOpen}
        title={t('myList.sortTitleLabel')}
        onClose={() => setIsSortOpen(false)}
        actions={(Object.keys(SORT_LABEL_KEYS) as SortOption[]).map((option) => ({
          label: t(SORT_LABEL_KEYS[option]),
          onPress: () => setSortOption(option),
        }))}
      />
    </SafeAreaView>
  );
}
