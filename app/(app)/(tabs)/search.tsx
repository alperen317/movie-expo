import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CARD_WIDTH,
  GRID_GAP,
  GRID_PADDING,
  MovieCard,
  getGridColumns,
  padGridRow,
  toMovieCardItem,
} from '../../../components/home/MovieCard';
import { useTabBarScrollInset } from '../../../components/navigation/FloatingTabBar';
import { GenreStrip } from '../../../components/search/GenreStrip';
import { MediaResultRow } from '../../../components/search/MediaResultRow';
import { PersonResultRow } from '../../../components/search/PersonResultRow';
import { SearchResultSkeleton } from '../../../components/search/SearchResultSkeleton';
import { ActionSheetModal } from '../../../components/ui/ActionSheetModal';
import { AnimatedPressable, AnimatedView } from '../../../components/ui/AnimatedPressable';
import { MediaFilterBar } from '../../../components/ui/MediaFilterBar';
import { SortButton } from '../../../components/ui/SortButton';
import { useDiscoverFeed } from '../../../lib/hooks/useDiscoverFeed';
import { useMediaSearch } from '../../../lib/hooks/useMediaSearch';
import {
  RATING_THRESHOLDS,
  useMediaTypeGenreFilter,
} from '../../../lib/hooks/useMediaTypeGenreFilter';
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from '../../../lib/storage/recentSearches';
import { useThemeColors } from '../../../lib/theme/useThemeColors';
import { getGenreCatalog } from '../../../lib/tmdb/genres';
import type { DiscoverSort } from '../../../lib/tmdb/discover';
import { useMovieStore } from '../../../stores/movie.store';

type SearchSortOption = 'relevance' | 'rating' | 'title' | 'year';

const SORT_LABEL_KEYS: Record<SearchSortOption, string> = {
  relevance: 'search.sortRelevance',
  rating: 'search.sortRating',
  title: 'search.sortTitle',
  year: 'search.sortYear',
};

// The filter row's sort button is narrow, so it carries the short form; the
// full phrasing stays in the sort sheet where there's room for it.
const SORT_SHORT_LABEL_KEYS: Record<SearchSortOption, string> = {
  relevance: 'search.sortShortRelevance',
  rating: 'search.sortShortRating',
  title: 'search.sortShortTitle',
  year: 'search.sortShortYear',
};

// Browsing by filter has no query to be relevant to, so that option means
// "most popular" there and says so.
const DISCOVER_SORT_LABEL_KEYS: Record<SearchSortOption, string> = {
  ...SORT_LABEL_KEYS,
  relevance: 'search.sortPopular',
};

const DISCOVER_SORT_SHORT_LABEL_KEYS: Record<SearchSortOption, string> = {
  ...SORT_SHORT_LABEL_KEYS,
  relevance: 'search.sortShortPopular',
};

const DISCOVER_SORT: Record<SearchSortOption, DiscoverSort> = {
  relevance: 'popularity',
  rating: 'rating',
  title: 'title',
  year: 'year',
};

// Poster + gutter + gap, so row separators start under the title rather than
// cutting the full width. The people list has a narrower avatar, hence its own.
const SEPARATOR_INSET = 84;
const PERSON_SEPARATOR_INSET = 76;

// How many people the mixed "All" list previews before handing off to the
// dedicated People tab -- enough to catch the person you meant, short enough
// that titles stay above the fold.
const PEOPLE_PREVIEW_COUNT = 3;

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="mb-stack-md flex-row items-center justify-between px-margin-mobile">
      <Text className="text-title-md font-sans-semibold text-text-primary">{title}</Text>
      {action && (
        <AnimatedPressable onPress={action.onPress} accessibilityRole="button" hitSlop={8}>
          <Text className="font-sans-bold text-label-caps uppercase text-text-secondary">
            {action.label}
          </Text>
        </AnimatedPressable>
      )}
    </View>
  );
}

// Shown while a newer query is in flight but the previous results are still on
// screen; without it, refining a search changes the list with no warning that
// anything was loading.
function RefiningIndicator({ active, color }: { active: boolean; color: string }) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    if (!active || reducedMotion) {
      opacity.value = active ? 0.6 : 0;
      return;
    }
    opacity.value = withRepeat(
      withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [active, opacity, reducedMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // The 2px track is always rendered so results don't shift when it appears.
  return (
    <AnimatedView
      style={[{ height: 2, marginHorizontal: 16, borderRadius: 2, backgroundColor: color }, style]}
    />
  );
}

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const scrollInset = useTabBarScrollInset();
  // The tab screen container doesn't shrink to the viewport, so a flex-1 root
  // grows to fit its content -- which leaves the results list with a viewport
  // as tall as its own content and makes onEndReached fire on every page in a
  // row. Pinning the height is what the other tab roots do for the same reason.
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  const [isInputFocused, setIsInputFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SearchSortOption>('relevance');
  // Kept separate from the media-type filter (which the shared hook owns and
  // only knows about movies and shows) so picking People doesn't have to mean
  // an empty media filter.
  const [showPeopleOnly, setShowPeopleOnly] = useState(false);

  const handleQueryResolved = useCallback((resolvedQuery: string) => {
    addRecentSearch(resolvedQuery).then(setRecentSearches);
  }, []);

  const { query, setQuery, submitQuery, results, people, status, isLoadingMore, loadMore, retry } =
    useMediaSearch({ onQueryResolved: handleQueryResolved });

  const trendingMovies = useMovieStore((state) => state.trendingMovies);
  const fetchTrendingMovies = useMovieStore((state) => state.fetchTrendingMovies);

  useEffect(() => {
    getRecentSearches().then(setRecentSearches);
    if (useMovieStore.getState().trendingMovies.length === 0) {
      fetchTrendingMovies();
    }
  }, [fetchTrendingMovies]);

  const {
    mediaTypeFilter,
    setMediaTypeFilter,
    genreFilter,
    setGenreFilter,
    minRating,
    setMinRating,
    decadeFilter,
    setDecadeFilter,
    availableGenres,
    availableRatings,
    availableDecades,
    filteredItems,
    activeFilterCount,
    clearFilters,
  } = useMediaTypeGenreFilter(results);

  // Driven by the raw input rather than the debounced query so the screen
  // reacts on the first keystroke instead of 350ms later.
  const isBrowsing = query.trim().length === 0;
  // With no query the same filters can't narrow a result list -- there isn't
  // one -- so they drive a TMDB discover feed instead. Below one active filter
  // that feed would just be "everything", so the browse screen stays as it is.
  const isDiscovering = isBrowsing && activeFilterCount > 0;

  const discover = useDiscoverFeed({
    enabled: isDiscovering,
    mediaType: mediaTypeFilter,
    genreName: genreFilter,
    minRating,
    decade: decadeFilter,
    sort: DISCOVER_SORT[sortOption],
  });

  // Browsing by filter and narrowing a result list are two separate acts of
  // filtering over two different corpora. Carrying "Action, 8+" from a discover
  // feed into a text search reads as a broken search, since one page of matches
  // rarely satisfies both, so crossing between the two starts clean.
  const wasBrowsing = useRef(isBrowsing);
  useEffect(() => {
    if (wasBrowsing.current === isBrowsing) return;
    wasBrowsing.current = isBrowsing;
    clearFilters();
    setShowPeopleOnly(false);
  }, [isBrowsing, clearFilters]);

  // Chips come from the full TMDB genre list while discovering: a server-side
  // feed has no loaded items to read a facet off, and every genre has results.
  const discoverGenres = useMemo(
    () => getGenreCatalog(i18n.language).map((option) => option.name),
    [i18n.language],
  );

  // People fall out of the same paged response, so the tab disappears on its
  // own when a new query has none -- no stranded empty state to recover from.
  const isPersonMode = showPeopleOnly && people.length > 0;
  const showPeopleSection = !isPersonMode && mediaTypeFilter === 'all' && people.length > 0;
  const hasAnyResults = results.length + people.length > 0;

  const sortedResults = useMemo(() => {
    if (sortOption === 'relevance') return filteredItems;
    return [...filteredItems].sort((a, b) => {
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
  }, [filteredItems, sortOption]);

  const trendingItems = useMemo(() => trendingMovies.map(toMovieCardItem), [trendingMovies]);

  // 'idle' with text in the box means the debounce hasn't fired yet.
  const isPending = status === 'loading' || (status === 'idle' && !isBrowsing);

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const searchField = (
    <View
      className={`flex-row items-center rounded-xl border px-4 ${
        isInputFocused
          ? 'border-primary-container bg-surface-container'
          : 'border-glass-border bg-surface'
      }`}
    >
      <MaterialIcons name="search" size={20} color={isInputFocused ? colors.gold : colors.icon} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        onFocus={() => setIsInputFocused(true)}
        onBlur={() => setIsInputFocused(false)}
        onSubmitEditing={() => {
          submitQuery(query);
          Keyboard.dismiss();
        }}
        placeholder={t('search.placeholder')}
        placeholderTextColor={`${colors.textSecondary}80`}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        className="flex-1 px-3 py-4 font-sans text-body-md text-text-primary"
      />
      {query.length > 0 && (
        <Pressable
          onPress={() => setQuery('')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.clearSearch')}
        >
          <MaterialIcons name="close" size={18} color={colors.icon} />
        </Pressable>
      )}
    </View>
  );

  const genreSection = (
    <>
      <SectionHeader title={t('search.popularGenres')} />
      <GenreStrip />
    </>
  );

  const browseView = (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: scrollInset }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {recentSearches.length > 0 && (
        <View className="pb-stack-lg">
          <SectionHeader
            title={t('search.recentSearches')}
            action={{ label: t('search.clearRecent'), onPress: handleClearRecent }}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
          >
            {recentSearches.map((entry) => (
              <View
                key={entry}
                className="h-9 flex-row items-center rounded-full border border-glass-border bg-background-blur pl-3 pr-1"
              >
                <AnimatedPressable
                  onPress={() => submitQuery(entry)}
                  accessibilityRole="button"
                  accessibilityLabel={t('a11y.repeatSearch', { query: entry })}
                  className="flex-row items-center gap-2 pr-2"
                >
                  <MaterialIcons name="history" size={15} color={colors.icon} />
                  <Text className="font-sans text-caption text-text-primary">{entry}</Text>
                </AnimatedPressable>
                <Pressable
                  onPress={() => removeRecentSearch(entry).then(setRecentSearches)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={t('a11y.removeRecentSearch', { query: entry })}
                  className="h-7 w-7 items-center justify-center rounded-full"
                >
                  <MaterialIcons name="close" size={14} color={colors.icon} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {trendingItems.length > 0 && (
        <View className="pb-stack-lg">
          <SectionHeader
            title={t('search.popularTitle')}
            action={{
              label: t('home.viewAll'),
              onPress: () =>
                router.push({
                  pathname: '/list/[source]',
                  params: { source: 'trending-movies' },
                }),
            }}
          />
          <FlatList
            horizontal
            data={trendingItems}
            keyExtractor={(item) => `${item.mediaType}-${item.id}`}
            renderItem={({ item, index }) => <MovieCard item={item} index={index} />}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
          />
        </View>
      )}
    </ScrollView>
  );

  const discoverColumns = getGridColumns(windowWidth);
  const discoverGrid = padGridRow(discover.items, discoverColumns);

  const discoverView = discover.isLoading ? (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator color={colors.textPrimary} />
    </View>
  ) : discover.error ? (
    <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
      <MaterialIcons name="cloud-off" size={32} color={colors.icon} />
      <Text className="text-center font-sans text-body-md text-text-secondary">
        {discover.error}
      </Text>
    </View>
  ) : discover.items.length === 0 ? (
    <View className="flex-1 items-center gap-stack-sm px-margin-mobile pt-stack-lg">
      <MaterialIcons name="filter-alt-off" size={32} color={colors.icon} />
      <Text className="text-center text-title-md font-sans-semibold text-text-primary">
        {t('common.noFilterMatches')}
      </Text>
      <AnimatedPressable
        onPress={clearFilters}
        accessibilityRole="button"
        className="rounded-full border border-glass-border bg-background-blur px-6 py-3"
      >
        <Text className="font-sans-semibold text-primary-container">
          {t('common.clearFilters')}
        </Text>
      </AnimatedPressable>
    </View>
  ) : (
    <FlatList
      key={discoverColumns}
      data={discoverGrid}
      numColumns={discoverColumns}
      keyExtractor={(item, index) => (item ? `${item.mediaType}-${item.id}` : `filler-${index}`)}
      renderItem={({ item, index }) =>
        item ? (
          <MovieCard item={item} index={index % discoverColumns} />
        ) : (
          <View style={{ width: CARD_WIDTH }} />
        )
      }
      columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: GRID_GAP }}
      contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: scrollInset }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onEndReached={discover.loadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <Text className="pb-stack-sm pt-stack-sm font-sans text-caption text-on-surface-variant">
          {t('search.discoverCount', { total: discover.items.length })}
        </Text>
      }
      ListFooterComponent={
        discover.isLoadingMore ? (
          <View className="py-stack-md">
            <ActivityIndicator color={colors.textSecondary} />
          </View>
        ) : null
      }
    />
  );

  const noResultsView = (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: scrollInset }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View className="items-center gap-stack-sm px-margin-mobile pb-stack-lg pt-stack-lg">
        <MaterialIcons name="search-off" size={32} color={colors.icon} />
        <Text className="text-title-md font-sans-semibold text-text-primary">
          {t('search.noResultsTitle')}
        </Text>
        <Text className="text-center font-sans text-body-md text-text-secondary">
          {t('search.noResultsSubtitle')}
        </Text>
        <AnimatedPressable
          onPress={() => setQuery('')}
          accessibilityRole="button"
          className="mt-stack-sm rounded-full border border-glass-border px-6 py-3"
        >
          <Text className="font-sans-semibold text-body-md text-text-secondary">
            {t('search.clearSearch')}
          </Text>
        </AnimatedPressable>
      </View>
      <View>{genreSection}</View>
    </ScrollView>
  );

  const errorView = (
    <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
      <MaterialIcons name="cloud-off" size={32} color={colors.icon} />
      <Text className="text-title-md font-sans-semibold text-text-primary">
        {t('search.errorTitle')}
      </Text>
      <Text className="text-center font-sans text-body-md text-text-secondary">
        {t('search.errorSubtitle')}
      </Text>
      <AnimatedPressable
        onPress={retry}
        accessibilityRole="button"
        className="mt-stack-sm rounded-full bg-primary-container px-6 py-3"
      >
        <Text className="font-sans-semibold text-body-md text-on-primary-container">
          {t('common.tryAgain')}
        </Text>
      </AnimatedPressable>
    </View>
  );

  const resultCountLabel = (total: number) => (
    <Text className="px-margin-mobile pb-stack-sm pt-stack-sm font-sans text-caption text-on-surface-variant">
      {t('search.resultCount', { total })}
    </Text>
  );

  const loadMoreFooter = isLoadingMore ? (
    <View className="py-stack-md">
      <ActivityIndicator color={colors.textSecondary} />
    </View>
  ) : null;

  const peopleSection = (
    <View className="pb-stack-sm pt-stack-sm">
      <SectionHeader
        title={t('search.peopleSection')}
        action={
          people.length > PEOPLE_PREVIEW_COUNT
            ? { label: t('home.viewAll'), onPress: () => setShowPeopleOnly(true) }
            : undefined
        }
      />
      {people.slice(0, PEOPLE_PREVIEW_COUNT).map((person) => (
        <PersonResultRow key={person.id} item={person} />
      ))}
    </View>
  );

  const resultsList = isPersonMode ? (
    <FlatList
      data={people}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <PersonResultRow item={item} />}
      ItemSeparatorComponent={() => (
        <View style={{ marginLeft: PERSON_SEPARATOR_INSET }} className="h-px bg-glass-border" />
      )}
      ListHeaderComponent={resultCountLabel(people.length)}
      ListFooterComponent={loadMoreFooter}
      contentContainerStyle={{ paddingBottom: scrollInset }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
    />
  ) : (
    <FlatList
      data={sortedResults}
      keyExtractor={(item) => `${item.mediaType}-${item.id}`}
      renderItem={({ item }) => <MediaResultRow item={item} />}
      ItemSeparatorComponent={() => (
        <View style={{ marginLeft: SEPARATOR_INSET }} className="h-px bg-glass-border" />
      )}
      ListHeaderComponent={
        <>
          {showPeopleSection && peopleSection}
          {sortedResults.length > 0 && resultCountLabel(sortedResults.length)}
        </>
      }
      // Rendered in place rather than as a full-height centred panel: the
      // people the query did match stay visible above it.
      ListEmptyComponent={
        <View className="items-center gap-stack-sm px-margin-mobile py-stack-lg">
          <MaterialIcons name="filter-alt-off" size={32} color={colors.icon} />
          <Text className="text-center text-title-md font-sans-semibold text-text-primary">
            {t('common.noFilterMatches')}
          </Text>
          <AnimatedPressable
            onPress={clearFilters}
            accessibilityRole="button"
            className="rounded-full border border-glass-border bg-background-blur px-6 py-3"
          >
            <Text className="font-sans-semibold text-primary-container">
              {t('common.clearFilters')}
            </Text>
          </AnimatedPressable>
        </View>
      }
      ListFooterComponent={loadMoreFooter}
      contentContainerStyle={{ paddingBottom: scrollInset }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
    />
  );

  const searchView = (
    <View className="flex-1">
      {hasAnyResults ? (
        <View className="px-margin-mobile pb-stack-sm">
          <MediaFilterBar
            mediaTypeFilter={mediaTypeFilter}
            onMediaTypeFilterChange={(value) => {
              setShowPeopleOnly(false);
              setMediaTypeFilter(value);
            }}
            genreFilter={genreFilter}
            onGenreFilterChange={setGenreFilter}
            availableGenres={availableGenres}
            minRating={minRating}
            onMinRatingChange={setMinRating}
            availableRatings={availableRatings}
            decadeFilter={decadeFilter}
            onDecadeFilterChange={setDecadeFilter}
            availableDecades={availableDecades}
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
            peopleSegment={
              people.length > 0
                ? { active: isPersonMode, onPress: () => setShowPeopleOnly(true) }
                : undefined
            }
            rightAccessory={
              isPersonMode ? undefined : (
                <SortButton
                  label={t(SORT_SHORT_LABEL_KEYS[sortOption])}
                  onPress={() => setIsSortOpen(true)}
                  // A fourth "People" segment shows whenever people.length > 0
                  // (see peopleSegment above); the label-less button is what
                  // keeps "TV Series" from wrapping on a narrow phone then.
                  compact={people.length > 0}
                />
              )
            }
          />
        </View>
      ) : (
        // Holds the filter row's place while the first page loads so the
        // results don't jump down the moment they arrive.
        isPending && <View style={{ height: 44 }} />
      )}

      <RefiningIndicator active={status === 'refining'} color={colors.gold} />

      {isPending ? (
        <SearchResultSkeleton />
      ) : status === 'error' ? (
        errorView
      ) : !hasAnyResults ? (
        noResultsView
      ) : (
        resultsList
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ height: windowHeight }} className="bg-background">
      <View className="gap-stack-md px-margin-mobile pb-stack-md pt-stack-sm">
        {isBrowsing && (
          <AnimatedView entering={FadeIn.duration(160)}>
            <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
              {t('search.heading')}
            </Text>
          </AnimatedView>
        )}
        {searchField}
      </View>

      {isBrowsing ? (
        <View className="flex-1">
          {/* Present with or without an active filter: it's the only way to
              start narrowing, and its genre chips are what the "Browse by
              Genre" strip used to be -- filtering in place rather than
              pushing a separate screen. */}
          <View className="px-margin-mobile pb-stack-sm">
            <MediaFilterBar
              mediaTypeFilter={mediaTypeFilter}
              onMediaTypeFilterChange={setMediaTypeFilter}
              genreFilter={genreFilter}
              onGenreFilterChange={setGenreFilter}
              availableGenres={discoverGenres}
              minRating={minRating}
              onMinRatingChange={setMinRating}
              availableRatings={RATING_THRESHOLDS}
              decadeFilter={decadeFilter}
              onDecadeFilterChange={setDecadeFilter}
              availableDecades={discover.availableDecades}
              activeFilterCount={activeFilterCount}
              onClearFilters={clearFilters}
              rightAccessory={
                isDiscovering ? (
                  <SortButton
                    label={t(DISCOVER_SORT_SHORT_LABEL_KEYS[sortOption])}
                    onPress={() => setIsSortOpen(true)}
                  />
                ) : undefined
              }
            />
          </View>
          {isDiscovering ? discoverView : browseView}
        </View>
      ) : (
        searchView
      )}

      <ActionSheetModal
        visible={isSortOpen}
        title={t('search.sortTitleLabel')}
        onClose={() => setIsSortOpen(false)}
        actions={(Object.keys(SORT_LABEL_KEYS) as SearchSortOption[]).map((option) => ({
          label: t((isBrowsing ? DISCOVER_SORT_LABEL_KEYS : SORT_LABEL_KEYS)[option]),
          selected: sortOption === option,
          onPress: () => setSortOption(option),
        }))}
      />
    </SafeAreaView>
  );
}
