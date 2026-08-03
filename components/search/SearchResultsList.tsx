import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import type { MediaCardItem } from '../home/MovieCard';
import { useThemeColors } from '../../lib/theme/useThemeColors';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { MediaResultRow } from './MediaResultRow';
import { PersonResultRow, type PersonResultItem } from './PersonResultRow';
import { SectionHeader } from './SectionHeader';

// Poster + gutter + gap, so row separators start under the title rather than
// cutting the full width. The people list has a narrower avatar, hence its own.
const SEPARATOR_INSET = 84;
const PERSON_SEPARATOR_INSET = 76;

// How many people the mixed "All" list previews before handing off to the
// dedicated People tab -- enough to catch the person you meant, short enough
// that titles stay above the fold.
const PEOPLE_PREVIEW_COUNT = 3;

export function SearchResultsList({
  isPersonMode,
  people,
  sortedResults,
  showPeopleSection,
  onViewAllPeople,
  isLoadingMore,
  loadMore,
  onClearFilters,
  scrollInset,
}: {
  isPersonMode: boolean;
  people: PersonResultItem[];
  sortedResults: MediaCardItem[];
  showPeopleSection: boolean;
  onViewAllPeople: () => void;
  isLoadingMore: boolean;
  loadMore: () => void;
  onClearFilters: () => void;
  scrollInset: number;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const resultCountLabel = (total: number) => (
    <Text className="px-margin-mobile pb-stack-sm pt-stack-sm font-sans text-caption text-on-surface-variant">
      {t('search.resultCount', { total })}
    </Text>
  );

  const loadMoreFooter = isLoadingMore ? (
    <View className="py-stack-md">
      <ActivityIndicator color={colors.textSecondary} />
    </View>
  ) : null;

  if (isPersonMode) {
    return (
      <FlatList
        data={people}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <PersonResultRow item={item} />}
        ItemSeparatorComponent={() => (
          <View style={{ marginLeft: PERSON_SEPARATOR_INSET }} className="h-px bg-glass-border" />
        )}
        ListHeaderComponent={resultCountLabel(people.length)}
        ListFooterComponent={loadMoreFooter}
        contentContainerStyle={{ paddingBottom: scrollInset }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
      />
    );
  }

  const peopleSection = (
    <View className="pb-stack-sm pt-stack-sm">
      <SectionHeader
        title={t('search.peopleSection')}
        action={
          people.length > PEOPLE_PREVIEW_COUNT
            ? { label: t('home.viewAll'), onPress: onViewAllPeople }
            : undefined
        }
      />
      {people.slice(0, PEOPLE_PREVIEW_COUNT).map((person) => (
        <PersonResultRow key={person.id} item={person} />
      ))}
    </View>
  );

  return (
    <FlatList
      data={sortedResults}
      keyExtractor={(item) => `${item.mediaType}-${item.id}`}
      renderItem={({ item }) => <MediaResultRow item={item} />}
      ItemSeparatorComponent={() => (
        <View style={{ marginLeft: SEPARATOR_INSET }} className="h-px bg-glass-border" />
      )}
      ListHeaderComponent={
        <>
          {showPeopleSection && peopleSection}
          {sortedResults.length > 0 && resultCountLabel(sortedResults.length)}
        </>
      }
      // Rendered in place rather than as a full-height centred panel: the
      // people the query did match stay visible above it.
      ListEmptyComponent={
        <View className="items-center gap-stack-sm px-margin-mobile py-stack-lg">
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
      }
      ListFooterComponent={loadMoreFooter}
      contentContainerStyle={{ paddingBottom: scrollInset }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
    />
  );
}
