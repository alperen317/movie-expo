import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { FadeInDown } from 'react-native-reanimated';

import { AnimatedPressable, AnimatedView } from '../ui/AnimatedPressable';
import { getPosterUrl } from '../../lib/tmdb/config';
import { getPrimaryGenre } from '../../lib/tmdb/genres';
import type { TMDBMovie, TMDBMultiSearchResult, TMDBTVShow } from '../../lib/tmdb/types';
import { useWatchLogStore } from '../../stores/watchLog.store';

export const CARD_WIDTH = 180;
export const GRID_GAP = 16;
export const GRID_PADDING = 16;

export function getGridColumns(windowWidth: number): number {
  return Math.max(
    2,
    Math.floor((windowWidth - GRID_PADDING * 2 + GRID_GAP) / (CARD_WIDTH + GRID_GAP)),
  );
}

// FlatList's `columnWrapperStyle={{ justifyContent: 'space-between' }}` spreads a
// short last row across the full row width -- e.g. 2 items with 6 columns (common
// on wide web viewports) renders one card pinned to the far left and the other to
// the far right. Padding the row out with null fillers keeps the gap fixed instead.
export function padGridRow<T>(items: T[], numColumns: number): (T | null)[] {
  if (items.length === 0) return items;
  const remainder = items.length % numColumns;
  if (remainder === 0) return items;
  return [...items, ...Array<null>(numColumns - remainder).fill(null)];
}

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
    genre: getPrimaryGenre(show.genre_ids, 'tv'),
    mediaType: 'tv',
  };
}

export function toSearchCardItem(result: TMDBMultiSearchResult): MediaCardItem | null {
  if (result.media_type !== 'movie' && result.media_type !== 'tv') return null;
  const isMovie = result.media_type === 'movie';

  return {
    id: result.id,
    title: (isMovie ? result.title : result.name) ?? '',
    year: (isMovie ? result.release_date : result.first_air_date)?.slice(0, 4) || null,
    posterPath: result.poster_path,
    voteAverage: result.vote_average ?? 0,
    genre: getPrimaryGenre(result.genre_ids ?? [], isMovie ? 'movie' : 'tv'),
    mediaType: result.media_type,
  };
}

export function MovieCard({
  item,
  index,
  onPress,
  selected,
}: {
  item: MediaCardItem;
  index?: number;
  // Short-circuits the default navigate-to-details tap. Used by flows
  // (e.g. picking items for a shared list) where tapping a card should
  // trigger a different action instead of leaving the screen.
  onPress?: () => void;
  // Draws a selected-state ring/checkmark overlay. Used together with
  // `onPress` for multi-select style pickers.
  selected?: boolean;
}) {
  const { t } = useTranslation();
  const posterUri = getPosterUrl(item.posterPath, 'w342');
  const subtitle = [item.genre, item.year].filter(Boolean).join(' • ');
  const personalRating = useWatchLogStore((state) => state.ratingFor(item.mediaType, item.id));
  const typeLabel = item.mediaType === 'tv' ? t('a11y.typeTv') : t('a11y.typeMovie');

  return (
    <AnimatedView entering={FadeInDown.delay(Math.min(index ?? 0, 8) * 40).duration(300)}>
      <AnimatedPressable
        onPress={
          onPress ??
          (() =>
            router.push({
              pathname: '/details/[id]',
              params: { id: String(item.id), type: item.mediaType },
            }))
        }
        accessibilityRole="button"
        accessibilityLabel={t('a11y.openDetails', { title: item.title, type: typeLabel })}
        accessibilityState={selected ? { selected: true } : undefined}
        style={{ width: CARD_WIDTH, aspectRatio: 2 / 3 }}
        className={`overflow-hidden rounded-2xl ${selected ? 'border-2 border-primary-container' : ''}`}
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
            {item.mediaType === 'tv' ? t('home.mediaTypeTv') : t('home.mediaTypeMovie')}
          </Text>
        </View>

        {personalRating !== null ? (
          <View className="absolute right-2 top-2 flex-row items-center gap-1 rounded-full bg-primary-container px-2 py-1">
            <MaterialIcons name="star" size={12} color="#3f2e00" />
            <Text className="font-sans-bold text-[10px] text-on-primary-container">
              {personalRating.toFixed(1)}
            </Text>
          </View>
        ) : (
          <View className="absolute right-2 top-2 flex-row items-center gap-1 rounded-full border border-glass-border bg-background-blur px-2 py-1">
            <MaterialIcons name="star" size={12} color="#f5c451" />
            <Text className="font-sans-bold text-[10px] text-text-primary">
              {item.voteAverage.toFixed(1)}
            </Text>
          </View>
        )}

        {selected && (
          <View className="absolute bottom-2 right-2 h-7 w-7 items-center justify-center rounded-full bg-primary-container">
            <MaterialIcons name="check" size={16} color="#3f2e00" />
          </View>
        )}

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
