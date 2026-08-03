import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { CARD_WIDTH, GRID_GAP, GRID_PADDING, MovieCard, padGridRow } from '../home/MovieCard';
import { useThemeColors } from '../../lib/theme/useThemeColors';
import type { useDiscoverFeed } from '../../lib/hooks/useDiscoverFeed';
import { AnimatedPressable } from '../ui/AnimatedPressable';

export function DiscoverGrid({
  discover,
  columns,
  scrollInset,
  onClearFilters,
}: {
  discover: ReturnType<typeof useDiscoverFeed>;
  columns: number;
  scrollInset: number;
  onClearFilters: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  if (discover.isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (discover.error) {
    return (
      <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
        <MaterialIcons name="cloud-off" size={32} color={colors.icon} />
        <Text className="text-center font-sans text-body-md text-text-secondary">
          {discover.error}
        </Text>
      </View>
    );
  }

  if (discover.items.length === 0) {
    return (
      <View className="flex-1 items-center gap-stack-sm px-margin-mobile pt-stack-lg">
        <MaterialIcons name="filter-alt-off" size={32} color={colors.icon} />
        <Text className="text-center text-title-md font-sans-semibold text-text-primary">
          {t('common.noFilterMatches')}
        </Text>
        <AnimatedPressable
          onPress={onClearFilters}
          accessibilityRole="button"
          className="rounded-full border border-glass-border bg-background-blur px-6 py-3"
        >
          <Text className="font-sans-semibold text-primary-container">
            {t('common.clearFilters')}
          </Text>
        </AnimatedPressable>
      </View>
    );
  }

  const grid = padGridRow(discover.items, columns);

  return (
    <FlatList
      key={columns}
      data={grid}
      numColumns={columns}
      keyExtractor={(item, index) => (item ? `${item.mediaType}-${item.id}` : `filler-${index}`)}
      renderItem={({ item, index }) =>
        item ? (
          <MovieCard item={item} index={index % columns} />
        ) : (
          <View style={{ width: CARD_WIDTH }} />
        )
      }
      columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: GRID_GAP }}
      contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: scrollInset }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onEndReached={discover.loadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <Text className="pb-stack-sm pt-stack-sm font-sans text-caption text-on-surface-variant">
          {t('search.discoverCount', { total: discover.items.length })}
        </Text>
      }
      ListFooterComponent={
        discover.isLoadingMore ? (
          <View className="py-stack-md">
            <ActivityIndicator color={colors.textSecondary} />
          </View>
        ) : null
      }
    />
  );
}
