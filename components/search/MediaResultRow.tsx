import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { AnimatedPressable } from '../ui/AnimatedPressable';
import type { MediaCardItem } from '../home/MovieCard';
import { getPosterUrl } from '../../lib/tmdb/config';
import { useThemeColors } from '../../lib/theme/useThemeColors';
import { useWatchLogStore } from '../../stores/watchLog.store';

const POSTER_WIDTH = 56;
const POSTER_HEIGHT = 84;

// Every row is the same height (the poster is always the tallest element, and
// the title is capped at two lines), which lets the list skip measurement and
// lets the skeleton match the real layout exactly.
export const RESULT_ROW_HEIGHT = POSTER_HEIGHT + 24;
export const RESULT_ROW_SEPARATOR = 1;

export function MediaResultRow({ item }: { item: MediaCardItem }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const posterUri = getPosterUrl(item.posterPath, 'w185');

  const personalRating = useWatchLogStore((state) => state.ratingFor(item.mediaType, item.id));
  const watched = useWatchLogStore((state) => state.isWatched(item.mediaType, item.id));

  const typeLabel = item.mediaType === 'tv' ? t('home.mediaTypeTv') : t('home.mediaTypeMovie');
  const meta = [item.year, item.genres[0]].filter(Boolean).join(' · ');

  return (
    <AnimatedPressable
      onPress={() =>
        router.push({
          pathname: '/details/[id]',
          params: { id: String(item.id), type: item.mediaType },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={t('a11y.openDetails', {
        title: item.title,
        type: item.mediaType === 'tv' ? t('a11y.typeTv') : t('a11y.typeMovie'),
      })}
      style={{ height: RESULT_ROW_HEIGHT }}
      className="flex-row items-center gap-3 px-margin-mobile"
    >
      <View
        style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT }}
        className="items-center justify-center overflow-hidden rounded-md border border-glass-border bg-surface-container"
      >
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT }}
            contentFit="cover"
          />
        ) : (
          <MaterialIcons
            name={item.mediaType === 'tv' ? 'live-tv' : 'movie'}
            size={20}
            color={colors.icon}
          />
        )}
      </View>

      <View className="flex-1 gap-1">
        <Text className="font-sans-semibold text-body-md text-text-primary" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="font-sans text-caption text-on-surface-variant" numberOfLines={1}>
          <Text className="font-sans-semibold text-text-secondary">{typeLabel}</Text>
          {meta ? ` · ${meta}` : ''}
        </Text>
      </View>

      <View className="items-end gap-1.5">
        <View className="flex-row items-center gap-1">
          <MaterialIcons name="star" size={13} color={colors.gold} />
          <Text className="font-sans-semibold text-caption text-text-primary">
            {item.voteAverage.toFixed(1)}
          </Text>
        </View>

        {/* The point of surfacing this in search: you find out you already
            watched something before opening it. */}
        {personalRating !== null ? (
          <View className="flex-row items-center gap-0.5 rounded-full bg-primary-container px-2 py-0.5">
            <MaterialIcons name="check" size={11} color={colors.onGold} />
            <Text className="font-sans-bold text-[11px] text-on-primary-container">
              {personalRating.toFixed(1)}
            </Text>
          </View>
        ) : watched ? (
          <MaterialIcons name="check-circle" size={16} color={colors.gold} />
        ) : null}
      </View>
    </AnimatedPressable>
  );
}
