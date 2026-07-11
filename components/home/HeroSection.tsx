import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { toMovieCardItem } from './MovieCard';
import { getBackdropUrl } from '../../lib/tmdb/config';
import { getPrimaryGenre } from '../../lib/tmdb/genres';
import type { TMDBMovie } from '../../lib/tmdb/types';
import { useListsStore } from '../../stores/lists.store';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.round(SCREEN_HEIGHT * 0.7);

export function HeroSection({ movie, width }: { movie: TMDBMovie; width?: number }) {
  const year = movie.release_date?.slice(0, 4);
  const genre = getPrimaryGenre(movie.genre_ids);
  const backdropUri = getBackdropUrl(movie.backdrop_path, 'w1280');

  const isWatchlisted = useListsStore((state) => state.isInWatchlist('movie', movie.id));
  const toggleWatchlist = useListsStore((state) => state.toggleWatchlist);
  const cardItem = useMemo(() => toMovieCardItem(movie), [movie]);

  return (
    <View style={{ height: HERO_HEIGHT, width }}>
      <Image
        source={backdropUri ? { uri: backdropUri } : undefined}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(19,19,19,0.4)', '#131313']}
        style={StyleSheet.absoluteFill}
      />

      <View className="absolute bottom-0 left-0 right-0 px-margin-mobile pb-stack-lg">
        <BlurView intensity={30} tint="dark" style={{ borderRadius: 20, overflow: 'hidden' }}>
          <View className="border border-glass-border bg-background-blur p-stack-md">
            <View className="mb-2 flex-row items-center gap-stack-sm">
              {genre && (
                <View className="rounded-full border border-glass-border bg-surface-container-high/50 px-2 py-1">
                  <Text className="font-sans-bold text-label-caps uppercase text-on-surface-variant">
                    {genre}
                  </Text>
                </View>
              )}
              {year && (
                <View className="rounded-full border border-glass-border bg-surface-container-high/50 px-2 py-1">
                  <Text className="font-sans-bold text-label-caps text-on-surface-variant">
                    {year}
                  </Text>
                </View>
              )}
              <View className="ml-auto flex-row items-center">
                <MaterialIcons name="star" size={16} color="#f5c451" />
                <Text className="ml-1 font-sans-bold text-label-caps text-primary-container">
                  {movie.vote_average.toFixed(1)}
                </Text>
              </View>
            </View>

            <Text
              className="mb-4 text-display-xl-mobile uppercase text-text-primary"
              numberOfLines={2}
            >
              {movie.title}
            </Text>
            <Text
              className="mb-6 font-sans text-body-md text-on-surface-variant"
              numberOfLines={3}
            >
              {movie.overview}
            </Text>

            <View className="flex-row gap-stack-sm">
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/details/[id]',
                    params: { id: String(movie.id), type: 'movie' },
                  })
                }
                className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-primary-container py-3"
              >
                <MaterialIcons name="play-arrow" size={20} color="#3f2e00" />
                <Text className="font-sans-semibold text-title-md text-on-primary">
                  Discover Now
                </Text>
              </Pressable>
              <Pressable
                onPress={() => toggleWatchlist(cardItem)}
                className="h-12 w-12 items-center justify-center rounded-full border border-glass-border bg-surface/40"
              >
                <MaterialIcons name={isWatchlisted ? 'check' : 'add'} size={22} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </BlurView>
      </View>
    </View>
  );
}
