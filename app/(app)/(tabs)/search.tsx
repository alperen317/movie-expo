import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaRow } from '../../../components/home/MediaRow';
import {
  CARD_WIDTH,
  GRID_GAP,
  GRID_PADDING,
  MovieCard,
  getGridColumns,
  padGridRow,
  toMovieCardItem,
} from '../../../components/home/MovieCard';
import { ActionSheetModal } from '../../../components/ui/ActionSheetModal';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { MediaFilterBar } from '../../../components/ui/MediaFilterBar';
import { useMediaSearch } from '../../../lib/hooks/useMediaSearch';
import { useMediaTypeGenreFilter } from '../../../lib/hooks/useMediaTypeGenreFilter';
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from '../../../lib/storage/recentSearches';
import { useThemeColors } from '../../../lib/theme/useThemeColors';
import { TMDB_GENRE_MAP } from '../../../lib/tmdb/genres';
import { useMovieStore } from '../../../stores/movie.store';

type SearchSortOption = 'relevance' | 'rating' | 'title' | 'year';

const SORT_LABEL_KEYS: Record<SearchSortOption, string> = {
  relevance: 'search.sortRelevance',
  rating: 'search.sortRating',
  title: 'search.sortTitle',
  year: 'search.sortYear',
};

export default function SearchScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [isInputFocused, setIsInputFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SearchSortOption>('relevance');

  const handleQueryResolved = useCallback((resolvedQuery: string) => {
    addRecentSearch(resolvedQuery).then(setRecentSearches);
  }, []);

  const { query, setQuery, debouncedQuery, results, isSearching, searchError } = useMediaSearch({
    onQueryResolved: handleQueryResolved,
  });

  const trendingMovies = useMovieStore((state) => state.trendingMovies);
  const fetchTrendingMovies = useMovieStore((state) => state.fetchTrendingMovies);

  useEffect(() => {
    getRecentSearches().then(setRecentSearches);
    if (useMovieStore.getState().trendingMovies.length === 0) {
      fetchTrendingMovies();
    }
  }, [fetchTrendingMovies]);

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const {
    mediaTypeFilter,
    setMediaTypeFilter,
    genreFilter,
    setGenreFilter,
    availableGenres,
    filteredItems,
    clearFilters,
  } = useMediaTypeGenreFilter(results);

  const sortedResults =
    sortOption === 'relevance'
      ? filteredItems
      : [...filteredItems].sort((a, b) => {
          switch (sortOption) {
            case 'rating':
              return b.voteAverage - a.voteAverage;
            case 'title':
              return a.title.localeCompare(b.title);
            case 'year':
              return (b.year ?? '').localeCompare(a.year ?? '');
            default:
              return 0;
          }
        });

  const numColumns = getGridColumns(windowWidth);
  const gridData = useMemo(
    () => padGridRow(sortedResults, numColumns),
    [sortedResults, numColumns],
  );
  const genreChips = useMemo(
    () =>
      Object.entries(TMDB_GENRE_MAP)
        .map(([id, fallback]) => ({
          id: Number(id),
          name: t(`genres.movie.${id}`, { defaultValue: fallback }),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [t],
  );

  const isBrowsing = debouncedQuery.length === 0;

  return (
    <SafeAreaView edges={['top']} style={{ height: windowHeight }} className="bg-background">
      <View className="gap-stack-md px-margin-mobile pb-stack-md pt-stack-sm">
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
          {t('search.heading')}
        </Text>

        <View
          className={`flex-row items-center rounded-xl border bg-surface px-4 ${
            isInputFocused ? 'border-primary-container' : 'border-glass-border'
          }`}
        >
          <MaterialIcons
            name="search"
            size={20}
            color={isInputFocused ? colors.gold : colors.icon}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder={t('search.placeholder')}
            placeholderTextColor="#A1A1AA"
            autoCorrect={false}
            returnKeyType="search"
            className="flex-1 py-4 px-3 font-sans text-body-md text-text-primary"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.clearSearch')}
            >
              <MaterialIcons name="close" size={18} color={colors.icon} />
            </Pressable>
          )}
        </View>
      </View>

      {isBrowsing ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >
          {recentSearches.length > 0 && (
            <View className="mb-section-gap px-margin-mobile">
              <View className="mb-stack-md flex-row items-end justify-between">
                <Text className="text-title-md font-sans-semibold text-text-primary">
                  {t('search.recentSearches')}
                </Text>
                <Pressable onPress={handleClearRecent}>
                  <Text className="font-sans-bold text-label-caps text-text-secondary">
                    {t('search.clearRecent')}
                  </Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-3">
                {recentSearches.map((entry) => (
                  <AnimatedPressable
                    key={entry}
                    onPress={() => setQuery(entry)}
                    className="flex-row items-center gap-2 rounded-full border border-glass-border bg-background-blur px-4 py-2"
                  >
                    <MaterialIcons name="history" size={16} color={colors.icon} />
                    <Text className="font-sans text-body-md text-text-primary">{entry}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          )}

          <View className="px-margin-mobile">
            <Text className="mb-stack-md text-title-md font-sans-semibold text-text-primary">
              {t('search.popularGenres')}
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {genreChips.map((genre) => (
                <AnimatedPressable
                  key={genre.id}
                  onPress={() =>
                    router.push({
                      pathname: '/list/[source]',
                      params: {
                        source: 'genre-movies',
                        genreId: String(genre.id),
                        title: genre.name,
                      },
                    })
                  }
                  className="rounded-full border border-glass-border bg-background-blur px-4 py-2"
                >
                  <Text className="font-sans text-body-md text-text-primary">{genre.name}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          {trendingMovies.length > 0 && (
            <MediaRow
              title={t('search.popularTitle')}
              items={trendingMovies.map(toMovieCardItem)}
              onViewAll={() =>
                router.push({ pathname: '/list/[source]', params: { source: 'trending-movies' } })
              }
            />
          )}
        </ScrollView>
      ) : (
        <>
          {isSearching && results.length === 0 && (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.textPrimary} />
            </View>
          )}

          {searchError && !isSearching && (
            <View className="flex-1 items-center justify-center px-margin-mobile">
              <Text className="text-center font-sans text-body-md text-text-primary">
                {searchError}
              </Text>
            </View>
          )}

          {!isSearching && !searchError && results.length === 0 && (
            <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
              <MaterialIcons name="search-off" size={32} color={colors.icon} />
              <Text className="text-title-md font-sans-semibold text-text-primary">
                {t('search.noResultsTitle')}
              </Text>
              <Text className="text-center font-sans text-body-md text-text-secondary">
                {t('search.noResultsSubtitle')}
              </Text>
            </View>
          )}

          {!searchError && results.length > 0 && (
            <>
              <View className="px-margin-mobile pb-stack-sm">
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
              </View>

              {sortedResults.length === 0 ? (
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
              ) : (
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
                  keyboardShouldPersistTaps="handled"
                />
              )}
            </>
          )}
        </>
      )}

      <ActionSheetModal
        visible={isSortOpen}
        title={t('search.sortTitleLabel')}
        onClose={() => setIsSortOpen(false)}
        actions={(Object.keys(SORT_LABEL_KEYS) as SearchSortOption[]).map((option) => ({
          label: `${sortOption === option ? '✓ ' : ''}${t(SORT_LABEL_KEYS[option])}`,
          onPress: () => setSortOption(option),
        }))}
      />
    </SafeAreaView>
  );
}
