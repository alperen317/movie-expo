import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';
import type { MediaTypeFilter } from '../../lib/hooks/useMediaTypeGenreFilter';

const MEDIA_TYPE_LABEL_KEYS: Record<MediaTypeFilter, string> = {
  all: 'common.filterAll',
  movie: 'common.filterMovies',
  tv: 'common.filterShows',
};

interface MediaFilterBarProps {
  mediaTypeFilter: MediaTypeFilter;
  onMediaTypeFilterChange: (value: MediaTypeFilter) => void;
  genreFilter: string | null;
  onGenreFilterChange: (value: string | null) => void;
  availableGenres: string[];
  // Rendered next to the media-type segmented control -- callers that also
  // offer a sort order (whose options vary by screen, so it isn't owned by
  // this component) slot their own sort button in here.
  rightAccessory?: ReactNode;
}

export function MediaFilterBar({
  mediaTypeFilter,
  onMediaTypeFilterChange,
  genreFilter,
  onGenreFilterChange,
  availableGenres,
  rightAccessory,
}: MediaFilterBarProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-stack-sm">
      <View className="flex-row items-center gap-2">
        <View className="flex-1 flex-row rounded-full border border-glass-border bg-surface-container-low p-1">
          {(['all', 'movie', 'tv'] as const).map((option) => (
            <AnimatedPressable
              key={option}
              onPress={() => onMediaTypeFilterChange(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: mediaTypeFilter === option }}
              className={`flex-1 items-center rounded-full py-2 ${
                mediaTypeFilter === option ? 'bg-primary-container' : ''
              }`}
            >
              <Text
                className={`font-sans-semibold text-caption ${
                  mediaTypeFilter === option ? 'text-on-primary-container' : 'text-text-secondary'
                }`}
              >
                {t(MEDIA_TYPE_LABEL_KEYS[option])}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
        {rightAccessory}
      </View>

      {availableGenres.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <AnimatedPressable
            onPress={() => onGenreFilterChange(null)}
            accessibilityRole="button"
            accessibilityState={{ selected: genreFilter === null }}
            className={`rounded-full border px-3 py-1.5 ${
              genreFilter === null
                ? 'border-primary-container bg-primary-container/10'
                : 'border-glass-border'
            }`}
          >
            <Text
              className={`font-sans-semibold text-caption ${
                genreFilter === null ? 'text-primary-container' : 'text-text-secondary'
              }`}
            >
              {t('common.filterAllGenres')}
            </Text>
          </AnimatedPressable>
          {availableGenres.map((genre) => (
            <AnimatedPressable
              key={genre}
              onPress={() => onGenreFilterChange(genre)}
              accessibilityRole="button"
              accessibilityState={{ selected: genreFilter === genre }}
              className={`rounded-full border px-3 py-1.5 ${
                genreFilter === genre
                  ? 'border-primary-container bg-primary-container/10'
                  : 'border-glass-border'
              }`}
            >
              <Text
                className={`font-sans-semibold text-caption ${
                  genreFilter === genre ? 'text-primary-container' : 'text-text-secondary'
                }`}
              >
                {genre}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
