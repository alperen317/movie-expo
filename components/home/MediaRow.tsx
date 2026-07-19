import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, View } from 'react-native';

import { MediaCardItem, MovieCard } from './MovieCard';
import { AnimatedPressable } from '../ui/AnimatedPressable';

export function MediaRow({
  title,
  items,
  onViewAll,
}: {
  title: string;
  items: MediaCardItem[];
  onViewAll?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="mt-section-gap">
      <View className="mb-stack-md flex-row items-end justify-between px-margin-mobile">
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">{title}</Text>
        {onViewAll && (
          <AnimatedPressable
            onPress={onViewAll}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.viewAll', { title })}
            className="flex-row items-center"
          >
            <Text className="font-sans-bold text-label-caps uppercase text-on-surface-variant">
              {t('home.viewAll')}
            </Text>
            <MaterialIcons name="chevron-right" size={16} color="#A1A1AA" />
          </AnimatedPressable>
        )}
      </View>
      <FlatList
        horizontal
        data={items}
        // Mixed rows (e.g. friends-watched) can hold a movie and a show with
        // the same TMDB id, so the key needs the media type too.
        keyExtractor={(item) => `${item.mediaType}-${item.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
        renderItem={({ item, index }) => <MovieCard item={item} index={index} />}
      />
    </View>
  );
}
