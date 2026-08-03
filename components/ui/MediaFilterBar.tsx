import { MaterialIcons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { ActionSheetModal } from './ActionSheetModal';
import { AnimatedPressable } from './AnimatedPressable';
import type { MediaTypeFilter } from '../../lib/hooks/useMediaTypeGenreFilter';
import { useThemeColors } from '../../lib/theme/useThemeColors';

const MEDIA_TYPE_LABEL_KEYS: Record<MediaTypeFilter, string> = {
  all: 'common.filterAll',
  movie: 'common.filterMovies',
  tv: 'common.filterShows',
};

// Turkish decade names take -ler or -lar depending on the vowel in the spoken
// tens word (yirmi -> 'ler, doksan -> 'lar), so the suffix is picked per decade
// instead of being interpolated from one translation string.
const TR_DECADE_SUFFIX = ['ler', 'lar', 'ler', 'lar', 'lar', 'ler', 'lar', 'ler', 'ler', 'lar'];

function formatDecade(decade: number, language: string): string {
  if (!language.startsWith('tr')) return `${decade}s`;
  return `${decade}'${TR_DECADE_SUFFIX[Math.floor(decade / 10) % 10]}`;
}

function ChipLabel({ label, selected }: { label: string; selected: boolean }) {
  return (
    <Text
      className={`font-sans-semibold text-caption ${
        selected ? 'text-primary-container' : 'text-text-secondary'
      }`}
    >
      {label}
    </Text>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
  icon,
  trailingIcon,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  trailingIcon?: React.ComponentProps<typeof MaterialIcons>['name'];
  accessibilityLabel?: string;
}) {
  const colors = useThemeColors();
  const tint = selected ? colors.gold : colors.textSecondary;

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      className={`h-9 flex-row items-center gap-1 rounded-full border px-3 ${
        selected ? 'border-primary-container bg-primary-container/10' : 'border-glass-border'
      }`}
    >
      {icon && <MaterialIcons name={icon} size={14} color={tint} />}
      <ChipLabel label={label} selected={selected} />
      {trailingIcon && <MaterialIcons name={trailingIcon} size={16} color={tint} />}
    </AnimatedPressable>
  );
}

interface MediaFilterBarProps {
  mediaTypeFilter: MediaTypeFilter;
  onMediaTypeFilterChange: (value: MediaTypeFilter) => void;
  genreFilter: string | null;
  onGenreFilterChange: (genre: string | null) => void;
  availableGenres: string[];
  // The rating and year facets are opt-in: screens that only need type + genre
  // (a shared list's items) keep the compact two-row bar by omitting them.
  minRating?: number | null;
  onMinRatingChange?: (value: number | null) => void;
  availableRatings?: number[];
  decadeFilter?: number | null;
  onDecadeFilterChange?: (value: number | null) => void;
  availableDecades?: number[];
  // Rendered as a trailing chip once anything is narrowed down, so the way out
  // of a four-dimension filter sits next to the filters themselves.
  activeFilterCount?: number;
  onClearFilters?: () => void;
  // A fourth segment for result kinds this bar can't filter (people in search).
  // While it's active the media facets are hidden -- none of them apply.
  peopleSegment?: { active: boolean; onPress: () => void };
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
  minRating = null,
  onMinRatingChange,
  availableRatings = [],
  decadeFilter = null,
  onDecadeFilterChange,
  availableDecades = [],
  activeFilterCount = 0,
  onClearFilters,
  peopleSegment,
  rightAccessory,
}: MediaFilterBarProps) {
  const { t, i18n } = useTranslation();
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);

  const showRating = Boolean(onMinRatingChange) && availableRatings.length > 0;
  const showYear = Boolean(onDecadeFilterChange) && availableDecades.length > 1;
  const showClear = Boolean(onClearFilters) && activeFilterCount > 0;
  const peopleActive = peopleSegment?.active ?? false;

  const segmentedControl = (
    <View className="flex-row items-center gap-2">
      <View className="flex-1 flex-row rounded-full border border-glass-border bg-surface-container-low p-1">
        {(['all', 'movie', 'tv'] as const).map((option) => {
          const selected = !peopleActive && mediaTypeFilter === option;
          return (
            <AnimatedPressable
              key={option}
              onPress={() => onMediaTypeFilterChange(option)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`flex-1 items-center rounded-full py-2 ${
                selected ? 'bg-primary-container' : ''
              }`}
            >
              <Text
                numberOfLines={1}
                className={`font-sans-semibold text-caption ${
                  selected ? 'text-on-primary-container' : 'text-text-secondary'
                }`}
              >
                {t(MEDIA_TYPE_LABEL_KEYS[option])}
              </Text>
            </AnimatedPressable>
          );
        })}
        {peopleSegment && (
          <AnimatedPressable
            onPress={peopleSegment.onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: peopleActive }}
            className={`flex-1 items-center rounded-full py-2 ${
              peopleActive ? 'bg-primary-container' : ''
            }`}
          >
            <Text
              numberOfLines={1}
              className={`font-sans-semibold text-caption ${
                peopleActive ? 'text-on-primary-container' : 'text-text-secondary'
              }`}
            >
              {t('common.filterPeople')}
            </Text>
          </AnimatedPressable>
        )}
      </View>
      {rightAccessory}
    </View>
  );

  // People aren't filtered by genre, rating or year, so the rest of the bar
  // would only offer controls that do nothing.
  if (peopleActive) return segmentedControl;

  return (
    <View className="gap-stack-sm">
      {segmentedControl}

      {/* One option is nothing to choose between -- unless it's the one that's
          already on, which has to stay switchable off. */}
      {(availableGenres.length > 1 || genreFilter !== null) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <FilterChip
            label={t('common.filterAllGenres')}
            selected={genreFilter === null}
            onPress={() => onGenreFilterChange(null)}
          />
          {availableGenres.map((genre) => (
            <FilterChip
              key={genre}
              label={genre}
              selected={genreFilter === genre}
              // Tapping the active genre again clears it, so the chip that
              // narrowed the list is also the one that widens it back.
              onPress={() => onGenreFilterChange(genreFilter === genre ? null : genre)}
            />
          ))}
        </ScrollView>
      )}

      {(showRating || showYear || showClear) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {showRating && (
            <FilterChip
              icon="star"
              trailingIcon="expand-more"
              label={
                minRating === null
                  ? t('common.filterRatingAny')
                  : t('common.filterRatingValue', { rating: minRating })
              }
              selected={minRating !== null}
              onPress={() => setIsRatingOpen(true)}
              accessibilityLabel={t('a11y.openRatingFilter')}
            />
          )}
          {showYear && (
            <FilterChip
              icon="event"
              trailingIcon="expand-more"
              label={
                decadeFilter === null
                  ? t('common.filterYearAny')
                  : formatDecade(decadeFilter, i18n.language)
              }
              selected={decadeFilter !== null}
              onPress={() => setIsYearOpen(true)}
              accessibilityLabel={t('a11y.openYearFilter')}
            />
          )}
          {showClear && (
            <FilterChip
              icon="filter-alt-off"
              label={t('common.clearFilters')}
              selected={false}
              onPress={() => onClearFilters?.()}
            />
          )}
        </ScrollView>
      )}

      {showRating && (
        <ActionSheetModal
          visible={isRatingOpen}
          title={t('common.filterRatingTitle')}
          onClose={() => setIsRatingOpen(false)}
          actions={[
            {
              label: t('common.filterRatingAny'),
              selected: minRating === null,
              onPress: () => onMinRatingChange?.(null),
            },
            ...availableRatings.map((threshold) => ({
              label: t('common.filterRatingValue', { rating: threshold }),
              selected: minRating === threshold,
              onPress: () => onMinRatingChange?.(threshold),
            })),
          ]}
        />
      )}

      {showYear && (
        <ActionSheetModal
          visible={isYearOpen}
          title={t('common.filterYearTitle')}
          onClose={() => setIsYearOpen(false)}
          actions={[
            {
              label: t('common.filterYearAny'),
              selected: decadeFilter === null,
              onPress: () => onDecadeFilterChange?.(null),
            },
            ...availableDecades.map((decade) => ({
              label: formatDecade(decade, i18n.language),
              selected: decadeFilter === decade,
              onPress: () => onDecadeFilterChange?.(decade),
            })),
          ]}
        />
      )}
    </View>
  );
}
