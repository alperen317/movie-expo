import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, useWindowDimensions, View } from 'react-native';
import { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CARD_WIDTH, MediaCardItem, MovieCard, toMovieCardItem, toTVCardItem } from '../../../components/home/MovieCard';
import { AnimatedPressable, AnimatedView } from '../../../components/ui/AnimatedPressable';
import { toPersonDetails } from '../../../lib/tmdb/details';
import { discoverMoviesByGenre, getTrendingMovies } from '../../../lib/tmdb/movies';
import { getPersonDetails } from '../../../lib/tmdb/person';
import { getPopularTVShows } from '../../../lib/tmdb/tv';

type Source = 'trending-movies' | 'popular-tv' | 'person-credits' | 'genre-movies';

const GRID_GAP = 16;
const GRID_PADDING = 16;

interface SourcePage {
  results: MediaCardItem[];
  totalPages: number;
}

const SOURCE_CONFIG: Record<
  Exclude<Source, 'person-credits' | 'genre-movies'>,
  { title: string; fetchPage: (page: number) => Promise<SourcePage> }
> = {
  'trending-movies': {
    title: 'Trending This Week',
    fetchPage: async (page) => {
      const data = await getTrendingMovies('day', page);
      return { results: data.results.map(toMovieCardItem), totalPages: data.total_pages };
    },
  },
  'popular-tv': {
    title: 'Popular TV Shows',
    fetchPage: async (page) => {
      const data = await getPopularTVShows(page);
      return { results: data.results.map(toTVCardItem), totalPages: data.total_pages };
    },
  },
};

export default function ListScreen() {
  const { source, personId, genreId, title } = useLocalSearchParams<{
    source: string;
    personId?: string;
    genreId?: string;
    title?: string;
  }>();
  const { width: windowWidth } = useWindowDimensions();

  const config = useMemo<{ title: string; fetchPage: (page: number) => Promise<SourcePage> }>(() => {
    if (source === 'person-credits' && personId) {
      return {
        title: title || 'Known For',
        fetchPage: async () => {
          const person = toPersonDetails(await getPersonDetails(Number(personId)));
          return { results: person.knownFor, totalPages: 1 };
        },
      };
    }
    if (source === 'genre-movies' && genreId) {
      return {
        title: title || 'Genre',
        fetchPage: async (page) => {
          const data = await discoverMoviesByGenre(Number(genreId), page);
          return { results: data.results.map(toMovieCardItem), totalPages: data.total_pages };
        },
      };
    }
    return (
      SOURCE_CONFIG[source as Exclude<Source, 'person-credits' | 'genre-movies'>] ??
      SOURCE_CONFIG['trending-movies']
    );
  }, [source, personId, genreId, title]);

  const numColumns = Math.max(
    2,
    Math.floor((windowWidth - GRID_PADDING * 2 + GRID_GAP) / (CARD_WIDTH + GRID_GAP)),
  );

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
        setError(err instanceof Error ? err.message : 'Failed to load list.');
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

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-margin-mobile py-stack-md">
        <AnimatedPressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
        >
          <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
        </AnimatedPressable>
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
          {config.title}
        </Text>
      </View>

      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
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
          data={items}
          numColumns={numColumns}
          keyExtractor={(item) => `${item.mediaType}-${item.id}`}
          renderItem={({ item, index }) => <MovieCard item={item} index={index % numColumns} />}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: GRID_GAP }}
          contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <AnimatedView entering={FadeIn} style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator color="#ffffff" />
              </AnimatedView>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
