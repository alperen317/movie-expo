import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';

import { AnimatedPressable } from '../ui/AnimatedPressable';
import { getGenreCatalog } from '../../lib/tmdb/genres';

interface GenreChip {
  id: number;
  scope: 'movie' | 'tv';
  name: string;
}

// The catalog already folds the two genre maps into one entry per display name
// (Comedy exists in both, Sci-Fi & Fantasy only for TV), which is what keeps the
// strip from listing "Drama" twice pointing at two different browse screens.
// Whichever scope owns the name gets the tap.
function useGenreChips(): GenreChip[] {
  // The catalog resolves names through i18n directly, so the language is the
  // dependency that has to rebuild it.
  const { i18n } = useTranslation();

  return useMemo(
    () =>
      getGenreCatalog(i18n.language).map((option) => ({
        name: option.name,
        scope: option.movieId !== null ? ('movie' as const) : ('tv' as const),
        id: option.movieId ?? option.tvId ?? 0,
      })),
    [i18n.language],
  );
}

// One horizontally scrolling row instead of a wrapped block: 25+ identical
// pills stacked four rows deep were the heaviest thing on the browse screen
// and pushed the actual posters below the fold.
export function GenreStrip({
  contentPaddingHorizontal = 16,
}: {
  contentPaddingHorizontal?: number;
}) {
  const { t } = useTranslation();
  const genres = useGenreChips();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: 8, paddingHorizontal: contentPaddingHorizontal }}
    >
      {genres.map((genre) => (
        <AnimatedPressable
          key={`${genre.scope}-${genre.id}`}
          onPress={() =>
            router.push({
              pathname: '/list/[source]',
              params: {
                source: genre.scope === 'tv' ? 'genre-tv' : 'genre-movies',
                genreId: String(genre.id),
                title: genre.name,
              },
            })
          }
          accessibilityRole="button"
          accessibilityLabel={t('a11y.browseGenre', { genre: genre.name })}
          className="h-9 justify-center rounded-full border border-glass-border bg-background-blur px-4"
        >
          <Text className="font-sans text-caption text-text-primary">{genre.name}</Text>
        </AnimatedPressable>
      ))}
    </ScrollView>
  );
}
