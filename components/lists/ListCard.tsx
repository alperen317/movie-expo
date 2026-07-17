import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { getRelativeTimeParts } from '../../lib/format/relativeTime';
import type { SharedListSummary } from '../../lib/supabase/sharedLists';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { useThemeColors } from '../../lib/theme/useThemeColors';

function formatUpdatedAt(dateString: string, t: TFunction): string {
  const { unit, count } = getRelativeTimeParts(dateString);
  switch (unit) {
    case 'now':
      return t('components.listCard.updatedJustNow');
    case 'minutes':
      return t('components.listCard.updatedMinutes', { count });
    case 'hours':
      return t('components.listCard.updatedHours', { count });
    case 'days':
      return t('components.listCard.updatedDays', { count });
  }
}

export function ListCard({ list }: { list: SharedListSummary }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  return (
    <AnimatedPressable
      onPress={() => router.push({ pathname: '/lists/[id]', params: { id: list.id } })}
      accessibilityRole="button"
      accessibilityLabel={list.name}
      className="flex-row items-center gap-3 rounded-xl border border-glass-border bg-surface-container-low px-4 py-stack-md"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-container/20">
        <MaterialIcons name="movie-filter" size={20} color={colors.gold} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-body-md text-text-primary" numberOfLines={1}>
          {list.name}
        </Text>
        <Text className="font-sans text-caption text-text-secondary">
          {formatUpdatedAt(list.updatedAt, t)}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
    </AnimatedPressable>
  );
}
