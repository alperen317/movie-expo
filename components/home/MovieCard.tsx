import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { FadeInDown } from 'react-native-reanimated';

import { AnimatedPressable, AnimatedView } from '../ui/AnimatedPressable';
import { getPosterUrl } from '../../lib/tmdb/config';
import { getPrimaryGenre, TMDB_TV_GENRE_MAP } from '../../lib/tmdb/genres';
import type { TMDBMovie, TMDBTVShow } from '../../lib/tmdb/types';

export const CARD_WIDTH = 180;

export interface MediaCardItem {
  id: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  voteAverage: number;
  genre: string | null;
  mediaType: 'movie' | 'tv';
}

export function toMovieCardItem(movie: TMDBMovie): MediaCardItem {
  return {
    id: movie.id,
    title: movie.title,
    year: movie.release_date?.slice(0, 4) || null,
    posterPath: movie.poster_path,
    voteAverage: movie.vote_average,
    genre: getPrimaryGenre(movie.genre_ids),
    mediaType: 'movie',
  };
}

export function toTVCardItem(show: TMDBTVShow): MediaCardItem {
  return {
    id: show.id,
    title: show.name,
    year: show.first_air_date?.slice(0, 4) || null,
    posterPath: show.poster_path,
    voteAverage: show.vote_average,
    genre: getPrimaryGenre(show.genre_ids, TMDB_TV_GENRE_MAP),
    mediaType: 'tv',
  };
}

export function MovieCard({ item, index }: { item: MediaCardItem; index?: number }) {
  const posterUri = getPosterUrl(item.posterPath, 'w342');
  const subtitle = [item.genre, item.year].filter(Boolean).join(' • ');

  return (
    <AnimatedView entering={FadeInDown.delay(Math.min(index ?? 0, 8) * 40).duration(300)}>
      <AnimatedPressable
        onPress={() =>
          router.push({
            pathname: '/details/[id]',
            params: { id: String(item.id), type: item.mediaType },
          })
        }
        style={{ width: CARD_WIDTH, aspectRatio: 2 / 3 }}
        className="overflow-hidden rounded-2xl"
      >
        <Image
          source={posterUri ? { uri: posterUri } : undefined}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(9,9,9,0.9)']}
          style={StyleSheet.absoluteFill}
        />

        <View className="absolute left-2 top-2 rounded-full border border-glass-border bg-background-blur px-2 py-1">
          <Text className="font-sans-bold text-[10px] uppercase text-text-primary">
            {item.mediaType === 'tv' ? 'TV Series' : 'Movie'}
          </Text>
        </View>

        <View className="absolute right-2 top-2 flex-row items-center gap-1 rounded-full border border-glass-border bg-background-blur px-2 py-1">
          <MaterialIcons name="star" size={12} color="#f5c451" />
          <Text className="font-sans-bold text-[10px] text-text-primary">
            {item.voteAverage.toFixed(1)}
          </Text>
        </View>

        <View className="absolute bottom-0 left-0 right-0 p-3">
          <Text className="font-sans-semibold text-title-md text-text-primary" numberOfLines={1}>
            {item.title}
          </Text>
          {subtitle.length > 0 && (
            <Text className="font-sans text-caption text-on-surface-variant" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </AnimatedPressable>
    </AnimatedView>
  );
}
