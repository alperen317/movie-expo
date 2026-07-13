import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContinueWatchingRow } from '../../../components/home/ContinueWatchingRow';
import { HeroCarousel } from '../../../components/home/HeroCarousel';
import { MediaRow } from '../../../components/home/MediaRow';
import { toMovieCardItem, toTVCardItem } from '../../../components/home/MovieCard';
import { useEpisodeProgressStore } from '../../../stores/episodeProgress.store';
import { useMovieStore } from '../../../stores/movie.store';

export default function HomeScreen() {
  const {
    trendingMovies,
    isLoading,
    error,
    fetchTrendingMovies,
    popularTVShows,
    isTVLoading,
    fetchPopularTVShows,
  } = useMovieStore();
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    fetchTrendingMovies();
    fetchPopularTVShows();
    useEpisodeProgressStore.getState().fetchProgress();
  }, [fetchTrendingMovies, fetchPopularTVShows]);

  const heroSlides = trendingMovies.slice(0, 5);
  const rest = trendingMovies.slice(5);

  return (
    <SafeAreaView edges={['top']} style={{ height: windowHeight }} className="bg-background">
      <View className="flex-row items-center justify-between px-margin-mobile py-stack-sm">
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">Home</Text>
        <Pressable onPress={() => router.push('/calendar')} hitSlop={8}>
          <MaterialIcons name="calendar-today" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {isLoading && trendingMovies.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      )}

      {error && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center font-sans text-white">{error}</Text>
        </View>
      )}

      {!isLoading && !error && heroSlides.length > 0 && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >
          <HeroCarousel movies={heroSlides} />
          <ContinueWatchingRow />
          {rest.length > 0 && (
            <MediaRow
              title="Trending This Week"
              items={rest.map(toMovieCardItem)}
              onViewAll={() =>
                router.push({ pathname: '/list/[source]', params: { source: 'trending-movies' } })
              }
            />
          )}
          {!isTVLoading && popularTVShows.length > 0 && (
            <MediaRow
              title="Popular TV Shows"
              items={popularTVShows.map(toTVCardItem)}
              onViewAll={() =>
                router.push({ pathname: '/list/[source]', params: { source: 'popular-tv' } })
              }
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
