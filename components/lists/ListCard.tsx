import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import type { SharedListSummary } from '../../lib/supabase/sharedLists';
import { AnimatedPressable } from '../ui/AnimatedPressable';

function formatUpdatedAt(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Updated just now';
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Updated ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Updated ${diffDays}d ago`;
}

export function ListCard({ list }: { list: SharedListSummary }) {
  return (
    <AnimatedPressable
      onPress={() => router.push({ pathname: '/lists/[id]', params: { id: list.id } })}
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
          {formatUpdatedAt(list.updatedAt)}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#A1A1AA" />
    </AnimatedPressable>
  );
}
