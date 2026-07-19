import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Text, useWindowDimensions, View } from 'react-native';
import { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CARD_WIDTH,
  GRID_GAP,
  GRID_PADDING,
  MediaCardItem,
  MovieCard,
  getGridColumns,
  padGridRow,
  toMovieCardItem,
  toTVCardItem,
} from '../../../components/home/MovieCard';
import { AnimatedPressable, AnimatedView } from '../../../components/ui/AnimatedPressable';
import { useThemeColors } from '../../../lib/theme/useThemeColors';
import { toPersonDetails } from '../../../lib/tmdb/details';
import {
  discoverMoviesByGenre,
  discoverMoviesByPerson,
  getMovieRecommendations,
  getSimilarMovies,
  getTopRatedMovies,
  getTrendingMovies,
  getUpcomingMovies,
} from '../../../lib/tmdb/movies';
import { getPersonDetails } from '../../../lib/tmdb/person';
import {
  getPopularTVShows,
  getSimilarTVShows,
  getTopRatedTVShows,
  getTVRecommendations,
} from '../../../lib/tmdb/tv';

type Source =
  | 'trending-movies'
  | 'popular-tv'
  | 'top-rated-movies'
  | 'top-rated-tv'
  | 'upcoming-movies'
  | 'person-credits'
  | 'person-movies'
  | 'genre-movies'
  | 'recommendations';

type DynamicSource = 'person-credits' | 'person-movies' | 'genre-movies' | 'recommendations';

interface SourcePage {
  results: MediaCardItem[];
  totalPages: number;
}

const SOURCE_CONFIG: Record<
  Exclude<Source, DynamicSource>,
  { titleKey: string; fetchPage: (page: number) => Promise<SourcePage> }
> = {
  'trending-movies': {
    titleKey: 'home.trendingThisWeek',
    fetchPage: async (page) => {
      const data = await getTrendingMovies('day', page);
      return { results: data.results.map(toMovieCardItem), totalPages: data.total_pages };
    },
  },
  'popular-tv': {
    titleKey: 'home.popularTvShows',
    fetchPage: async (page) => {
      const data = await getPopularTVShows(page);
      return { results: data.results.map(toTVCardItem), totalPages: data.total_pages };
    },
  },
  'top-rated-movies': {
    titleKey: 'home.topRatedMovies',
    fetchPage: async (page) => {
      const data = await getTopRatedMovies(page);
      return { results: data.results.map(toMovieCardItem), totalPages: data.total_pages };
    },
  },
  'top-rated-tv': {
    titleKey: 'home.topRatedTvShows',
    fetchPage: async (page) => {
      const data = await getTopRatedTVShows(page);
      return { results: data.results.map(toTVCardItem), totalPages: data.total_pages };
    },
  },
  'upcoming-movies': {
    titleKey: 'home.upcomingMovies',
    fetchPage: async (page) => {
      const data = await getUpcomingMovies(page);
      return { results: data.results.map(toMovieCardItem), totalPages: data.total_pages };
    },
  },
};

export default function ListScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { source, personId, genreId, mediaId, mediaType, title } = useLocalSearchParams<{
    source: string;
    personId?: string;
    genreId?: string;
    mediaId?: string;
    mediaType?: string;
    title?: string;
  }>();
  const { width: windowWidth } = useWindowDimensions();

  const config = useMemo<{
    title: string;
    fetchPage: (page: number) => Promise<SourcePage>;
  }>(() => {
    if (source === 'person-credits' && personId) {
      return {
        title: title || t('actor.knownFor'),
        fetchPage: async () => {
          const person = toPersonDetails(await getPersonDetails(Number(personId)));
          return { results: person.knownFor, totalPages: 1 };
        },
      };
    }
    if (source === 'person-movies' && personId) {
      return {
        title: title || t('actor.knownFor'),
        fetchPage: async (page) => {
          const data = await discoverMoviesByPerson(Number(personId), page);
          return { results: data.results.map(toMovieCardItem), totalPages: data.total_pages };
        },
      };
    }
    if (source === 'genre-movies' && genreId) {
      return {
        title: title || t('browse.genre'),
        fetchPage: async (page) => {
          const data = await discoverMoviesByGenre(Number(genreId), page);
          return { results: data.results.map(toMovieCardItem), totalPages: data.total_pages };
        },
      };
    }
    if (source === 'recommendations' && mediaId) {
      const isTV = mediaType === 'tv';
      return {
        title: title || t('details.moreLikeThis'),
        fetchPage: async (page) => {
          // Recommendations dry up for niche titles; fall back to `similar`
          // on the first page so the screen never opens empty.
          if (isTV) {
            let data = await getTVRecommendations(Number(mediaId), page);
            if (data.results.length === 0 && page === 1) {
              data = await getSimilarTVShows(Number(mediaId), page);
            }
            return { results: data.results.map(toTVCardItem), totalPages: data.total_pages };
          }
          let data = await getMovieRecommendations(Number(mediaId), page);
          if (data.results.length === 0 && page === 1) {
            data = await getSimilarMovies(Number(mediaId), page);
          }
          return { results: data.results.map(toMovieCardItem), totalPages: data.total_pages };
        },
      };
    }
    const staticConfig =
      SOURCE_CONFIG[source as Exclude<Source, DynamicSource>] ?? SOURCE_CONFIG['trending-movies'];
    return { title: t(staticConfig.titleKey), fetchPage: staticConfig.fetchPage };
  }, [source, personId, genreId, mediaId, mediaType, title, t]);

  const numColumns = getGridColumns(windowWidth);

  const [items, setItems] = useState<MediaCardItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    config
      .fetchPage(1)
      .then(({ results, totalPages: total }) => {
        if (cancelled) return;
        setItems(results);
        setTotalPages(total);
        setPage(1);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t('browse.loadError'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [config]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || page >= totalPages) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    config
      .fetchPage(nextPage)
      .then(({ results, totalPages: total }) => {
        setItems((prev) => {
          const seen = new Set(prev.map((entry) => `${entry.mediaType}-${entry.id}`));
          const deduped = results.filter((entry) => !seen.has(`${entry.mediaType}-${entry.id}`));
          return [...prev, ...deduped];
        });
        setTotalPages(total);
        setPage(nextPage);
      })
      .catch(() => {})
      .finally(() => setIsLoadingMore(false));
  }, [config, isLoading, isLoadingMore, page, totalPages]);

  const gridData = useMemo(() => padGridRow(items, numColumns), [items, numColumns]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-margin-mobile py-stack-md">
        <AnimatedPressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.back')}
          className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
          {config.title}
        </Text>
      </View>

      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      )}

      {error && !isLoading && (
        <View className="flex-1 items-center justify-center px-margin-mobile">
          <Text className="text-center font-sans text-body-md text-text-primary">{error}</Text>
        </View>
      )}

      {!isLoading && !error && (
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
          contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <AnimatedView entering={FadeIn} style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator color={colors.textPrimary} />
              </AnimatedView>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
