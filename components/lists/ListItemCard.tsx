import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { CARD_WIDTH, MovieCard } from '../home/MovieCard';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { getRelativeTimeParts } from '../../lib/format/relativeTime';
import type { SharedListItem } from '../../lib/supabase/sharedLists';
import { useThemeColors } from '../../lib/theme/useThemeColors';

interface ListItemCardProps {
  item: SharedListItem;
  index?: number;
  currentUserId?: string;
  voteCount: number;
  votedByMe: boolean;
  onToggleVote: () => void;
  watchedCount: number;
  memberCount: number;
  onRemove: () => void;
}

export function ListItemCard({
  item,
  index,
  currentUserId,
  voteCount,
  votedByMe,
  onToggleVote,
  watchedCount,
  memberCount,
  onRemove,
}: ListItemCardProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const { unit, count } = getRelativeTimeParts(item.addedAt);
  const time =
    unit === 'now'
      ? t('listDetail.timeJustNow')
      : unit === 'minutes'
        ? t('listDetail.timeMinutes', { count })
        : unit === 'hours'
          ? t('listDetail.timeHours', { count })
          : t('listDetail.timeDays', { count });
  const caption =
    item.addedBy && item.addedBy === currentUserId
      ? t('listDetail.addedByCaptionSelf', { time })
      : item.addedByName
        ? t('listDetail.addedByCaption', { name: item.addedByName, time })
        : null;

  return (
    <View style={{ width: CARD_WIDTH }}>
      <View style={{ position: 'relative' }}>
        <MovieCard item={item} index={index} />
        <AnimatedPressable
          onPress={onToggleVote}
          accessibilityRole="button"
          accessibilityState={{ selected: votedByMe }}
          accessibilityLabel={t(votedByMe ? 'a11y.removeVote' : 'a11y.castVote', {
            title: item.title,
          })}
          className={`absolute bottom-2 left-2 flex-row items-center gap-1 rounded-full border px-2 py-1 ${
            votedByMe
              ? 'border-primary-container bg-primary-container'
              : 'border-glass-border bg-background-blur'
          }`}
        >
          <MaterialIcons name="thumb-up" size={14} color={votedByMe ? '#3f2e00' : colors.icon} />
          {voteCount > 0 && (
            <Text
              className={`font-sans-bold text-[10px] ${
                votedByMe ? 'text-on-primary-container' : 'text-text-primary'
              }`}
            >
              {voteCount}
            </Text>
          )}
        </AnimatedPressable>
        <AnimatedPressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.removeFromList', { title: item.title })}
          className="absolute bottom-2 right-2 h-8 w-8 items-center justify-center rounded-full border border-glass-border bg-background-blur"
        >
          <MaterialIcons name="delete-outline" size={16} color={colors.error} />
        </AnimatedPressable>
      </View>
      {caption && (
        <Text className="mt-1 font-sans text-caption text-text-secondary" numberOfLines={1}>
          {caption}
        </Text>
      )}
      {watchedCount > 0 && (
        <Text className="mt-0.5 font-sans text-caption text-text-secondary" numberOfLines={1}>
          {t('listDetail.watchedByCount', { watched: watchedCount, total: memberCount })}
        </Text>
      )}
    </View>
  );
}
