import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CARD_WIDTH,
  GRID_GAP,
  GRID_PADDING,
  MovieCard,
  getGridColumns,
  padGridRow,
} from '../../../components/home/MovieCard';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { useMediaSearch } from '../../../lib/hooks/useMediaSearch';
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from '../../../lib/storage/recentSearches';
import { getBackdropUrl } from '../../../lib/tmdb/config';
import { discoverMoviesByGenre } from '../../../lib/tmdb/movies';

const TILE_HEIGHT = 200;

interface Genre {
  id: number;
  nameKey: string;
  subtitleKey?: string;
  span: 'full' | 'half';
}

const GENRES: Genre[] = [
  {
    id: 27,
    nameKey: 'search.genres.horror',
    subtitleKey: 'search.genres.horrorSubtitle',
    span: 'full',
  },
  { id: 878, nameKey: 'search.genres.sciFi', span: 'half' },
  { id: 18, nameKey: 'search.genres.drama', span: 'half' },
  { id: 35, nameKey: 'search.genres.comedy', span: 'full' },
  { id: 28, nameKey: 'search.genres.action', span: 'full' },
];

function GenreTile({
  genre,
  backdropPath,
  style,
}: {
  genre: Genre;
  backdropPath?: string | null;
  style?: object;
}) {
  const { t } = useTranslation();
  const backdropUri = getBackdropUrl(backdropPath ?? null, 'w780');
  const name = t(genre.nameKey);

  return (
    <AnimatedPressable
      onPress={() =>
        router.push({
          pathname: '/list/[source]',
          params: { source: 'genre-movies', genreId: String(genre.id), title: name },
        })
      }
      style={[{ height: TILE_HEIGHT }, style]}
      className="overflow-hidden rounded-xl border border-glass-border bg-surface-container-low"
    >
      <Image
        source={backdropUri ? { uri: backdropUri } : undefined}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.9)']}
        style={StyleSheet.absoluteFill}
      />
      <View className="absolute bottom-0 left-0 right-0 p-stack-md">
        <Text className="text-headline-lg-mobile font-sans-bold uppercase text-text-primary">
          {name}
        </Text>
        {genre.subtitleKey && (
          <Text className="mt-1 font-sans text-caption text-on-surface-variant">
            {t(genre.subtitleKey)}
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [isInputFocused, setIsInputFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [genreBackdrops, setGenreBackdrops] = useState<Record<number, string | null>>({});

  const handleQueryResolved = useCallback((resolvedQuery: string) => {
    addRecentSearch(resolvedQuery).then(setRecentSearches);
  }, []);

  const { query, setQuery, debouncedQuery, results, isSearching, searchError } = useMediaSearch({
    onQueryResolved: handleQueryResolved,
  });

  useEffect(() => {
    getRecentSearches().then(setRecentSearches);

    let cancelled = false;
    Promise.all(
      GENRES.map((genre) =>
        discoverMoviesByGenre(genre.id, 1)
          .then((data) => [genre.id, data.results[0]?.backdrop_path ?? null] as const)
          .catch(() => [genre.id, null] as const),
      ),
    ).then((entries) => {
      if (!cancelled) setGenreBackdrops(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const numColumns = getGridColumns(windowWidth);
  const gridData = useMemo(() => padGridRow(results, numColumns), [results, numColumns]);

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
          <MaterialIcons name="search" size={20} color={isInputFocused ? '#f5c451' : '#A1A1AA'} />
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
              <MaterialIcons name="close" size={18} color="#A1A1AA" />
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
                    <MaterialIcons name="history" size={16} color="#A1A1AA" />
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
            <View className="gap-gutter">
              <GenreTile genre={GENRES[0]} backdropPath={genreBackdrops[GENRES[0].id]} />
              <View className="flex-row gap-gutter">
                <GenreTile
                  genre={GENRES[1]}
                  backdropPath={genreBackdrops[GENRES[1].id]}
                  style={{ flex: 1 }}
                />
                <GenreTile
                  genre={GENRES[2]}
                  backdropPath={genreBackdrops[GENRES[2].id]}
                  style={{ flex: 1 }}
                />
              </View>
              <GenreTile genre={GENRES[3]} backdropPath={genreBackdrops[GENRES[3].id]} />
              <GenreTile genre={GENRES[4]} backdropPath={genreBackdrops[GENRES[4].id]} />
            </View>
          </View>
        </ScrollView>
      ) : (
        <>
          {isSearching && results.length === 0 && (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#ffffff" />
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
              <MaterialIcons name="search-off" size={32} color="#A1A1AA" />
              <Text className="text-title-md font-sans-semibold text-text-primary">
                {t('search.noResultsTitle')}
              </Text>
              <Text className="text-center font-sans text-body-md text-text-secondary">
                {t('search.noResultsSubtitle')}
              </Text>
            </View>
          )}

          {!searchError && results.length > 0 && (
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
    </SafeAreaView>
  );
}
