import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { SharedListSummary } from '../../lib/supabase/sharedLists';
import { AnimatedPressable } from '../ui/AnimatedPressable';

function formatUpdatedAt(dateString: string, t: TFunction): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return t('components.listCard.updatedJustNow');
  if (diffMinutes < 60) return t('components.listCard.updatedMinutes', { count: diffMinutes });
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return t('components.listCard.updatedHours', { count: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  return t('components.listCard.updatedDays', { count: diffDays });
}

export function ListCard({ list }: { list: SharedListSummary }) {
  const { t } = useTranslation();
  return (
    <AnimatedPressable
      onPress={() => router.push({ pathname: '/lists/[id]', params: { id: list.id } })}
      accessibilityRole="button"
      accessibilityLabel={list.name}
      className="flex-row items-center gap-3 rounded-xl border border-glass-border bg-surface-container-low px-4 py-stack-md"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-container/20">
        <MaterialIcons name="movie-filter" size={20} color="#f5c451" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-semibold text-body-md text-text-primary" numberOfLines={1}>
          {list.name}
        </Text>
        <Text className="font-sans text-caption text-text-secondary">
          {formatUpdatedAt(list.updatedAt, t)}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#A1A1AA" />
    </AnimatedPressable>
  );
}
