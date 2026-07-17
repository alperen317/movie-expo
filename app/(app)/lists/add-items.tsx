import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CARD_WIDTH,
  GRID_GAP,
  GRID_PADDING,
  MovieCard,
  getGridColumns,
  padGridRow,
  toMovieCardItem,
  toTVCardItem,
  type MediaCardItem,
} from '../../../components/home/MovieCard';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { useThemeColors } from '../../../lib/theme/useThemeColors';
import { useMediaSearch } from '../../../lib/hooks/useMediaSearch';
import { getTrendingMovies } from '../../../lib/tmdb/movies';
import { getPopularTVShows } from '../../../lib/tmdb/tv';
import { useSharedListsStore } from '../../../stores/sharedLists.store';

export default function AddItemsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { width: windowWidth } = useWindowDimensions();

  const { query, setQuery, debouncedQuery, results, isSearching, searchError } = useMediaSearch();
  const items = useSharedListsStore((state) => state.items);
  const addItem = useSharedListsStore((state) => state.addItem);
  const removeItem = useSharedListsStore((state) => state.removeItem);

  const numColumns = getGridColumns(windowWidth);

  const isBrowsing = debouncedQuery.length === 0;

  // Popular movies + TV shows, shown when the search box is empty.
  const [popular, setPopular] = useState<MediaCardItem[]>([]);
  const [isPopularLoading, setIsPopularLoading] = useState(false);

  useEffect(() => {
    if (!isBrowsing) return;
    let cancelled = false;
    setIsPopularLoading(true);
    Promise.all([getTrendingMovies('day'), getPopularTVShows()])
      .then(([movies, shows]) => {
        if (cancelled) return;
        setPopular([...movies.results.map(toMovieCardItem), ...shows.results.map(toTVCardItem)]);
      })
      .catch(() => {
        if (!cancelled) setPopular([]);
      })
      .finally(() => {
        if (!cancelled) setIsPopularLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isBrowsing]);

  const popularGridData = useMemo(() => padGridRow(popular, numColumns), [popular, numColumns]);
  const resultsGridData = useMemo(() => padGridRow(results, numColumns), [results, numColumns]);

  const renderCard = ({ item, index }: { item: MediaCardItem | null; index: number }) => {
    if (!item) return <View style={{ width: CARD_WIDTH }} />;
    const key = `${item.mediaType}-${item.id}`;
    const isSelected = Boolean(items[key]);
    return (
      <MovieCard
        item={item}
        index={index % numColumns}
        selected={isSelected}
        onPress={() => {
          if (!listId) return;
          if (isSelected) removeItem(listId, item.id, item.mediaType);
          else addItem(listId, item);
        }}
      />
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-margin-mobile py-stack-md">
        <AnimatedPressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.back')}
          className="h-9 w-9 items-center justify-center"
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text className="flex-1 text-headline-lg-mobile font-sans-bold text-text-primary">
          {t('listDetail.addToList')}
        </Text>
        <AnimatedPressable onPress={() => router.back()}>
          <Text className="font-sans-semibold text-body-md text-primary-container">
            {t('common.done')}
          </Text>
        </AnimatedPressable>
      </View>

      <View className="px-margin-mobile pb-stack-md">
        <View className="flex-row items-center rounded-xl border border-glass-border bg-surface px-4">
          <MaterialIcons name="search" size={20} color={colors.icon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('listDetail.searchPlaceholder')}
            placeholderTextColor="#A1A1AA"
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            className="flex-1 px-3 py-4 font-sans text-body-md text-text-primary"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <MaterialIcons name="close" size={18} color={colors.icon} />
            </Pressable>
          )}
        </View>
      </View>

      {isBrowsing && isPopularLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      )}

      {isBrowsing && !isPopularLoading && popular.length > 0 && (
        <FlatList
          key={numColumns}
          data={popularGridData}
          numColumns={numColumns}
          keyExtractor={(item, index) =>
            item ? `${item.mediaType}-${item.id}` : `filler-${index}`
          }
          renderItem={renderCard}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: GRID_GAP }}
          contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text className="px-1 pb-3 pt-1 font-sans-semibold text-title-md text-text-primary">
              {t('listDetail.popularNow')}
            </Text>
          }
        />
      )}

      {!isBrowsing && isSearching && results.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      )}

      {!isBrowsing && searchError && !isSearching && (
        <View className="flex-1 items-center justify-center px-margin-mobile">
          <Text className="text-center font-sans text-body-md text-text-primary">
            {searchError}
          </Text>
        </View>
      )}

      {!isBrowsing && !searchError && !isSearching && results.length === 0 && (
        <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
          <MaterialIcons name="search-off" size={32} color={colors.icon} />
          <Text className="text-title-md font-sans-semibold text-text-primary">
            {t('search.noResultsTitle')}
          </Text>
        </View>
      )}

      {!isBrowsing && !searchError && results.length > 0 && (
        <FlatList
          key={numColumns}
          data={resultsGridData}
          numColumns={numColumns}
          keyExtractor={(item, index) =>
            item ? `${item.mediaType}-${item.id}` : `filler-${index}`
          }
          renderItem={renderCard}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: GRID_GAP }}
          contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}
