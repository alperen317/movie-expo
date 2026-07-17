import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { CARD_WIDTH, MovieCard } from '../home/MovieCard';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { BoringAvatar } from '../ui/BoringAvatar';
import { getRelativeTimeParts } from '../../lib/format/relativeTime';
import type { SharedListItem } from '../../lib/supabase/sharedLists';
import { useThemeColors } from '../../lib/theme/useThemeColors';

interface ListItemCardProps {
  item: SharedListItem;
  index?: number;
  currentUserId?: string;
  watchedCount: number;
  memberCount: number;
  onRemove: () => void;
}

export function ListItemCard({
  item,
  index,
  currentUserId,
  watchedCount,
  memberCount,
  onRemove,
}: ListItemCardProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const { unit, count } = getRelativeTimeParts(item.addedAt);
  const fullTime =
    unit === 'now'
      ? t('listDetail.timeJustNow')
      : unit === 'minutes'
        ? t('listDetail.timeMinutes', { count })
        : unit === 'hours'
          ? t('listDetail.timeHours', { count })
          : t('listDetail.timeDays', { count });
  const shortTime =
    unit === 'now'
      ? t('listDetail.timeShortNow')
      : unit === 'minutes'
        ? t('listDetail.timeShortMinutes', { count })
        : unit === 'hours'
          ? t('listDetail.timeShortHours', { count })
          : t('listDetail.timeShortDays', { count });

  // Hidden during the brief optimistic window before realtime confirms the
  // insert (rowId/addedByName are blank placeholders until then).
  const hasAddedByInfo = Boolean(item.rowId);
  const addedByFullText = hasAddedByInfo
    ? item.addedBy === currentUserId
      ? t('listDetail.addedByCaptionSelf', { time: fullTime })
      : item.addedByName
        ? t('listDetail.addedByCaption', { name: item.addedByName, time: fullTime })
        : null
    : null;
  const watchedFullText =
    watchedCount > 0
      ? t('listDetail.watchedByCount', { watched: watchedCount, total: memberCount })
      : null;
  const infoLabel = [addedByFullText, watchedFullText].filter(Boolean).join('. ');

  return (
    <View style={{ width: CARD_WIDTH }}>
      <View style={{ position: 'relative' }}>
        <MovieCard item={item} index={index} />
        <AnimatedPressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.removeFromList', { title: item.title })}
          className="absolute bottom-2 right-2 h-8 w-8 items-center justify-center rounded-full border border-glass-border bg-background-blur"
        >
          <MaterialIcons name="delete-outline" size={16} color={colors.error} />
        </AnimatedPressable>
      </View>
      {(hasAddedByInfo || watchedFullText) && (
        <View
          className="mt-1 flex-row items-center justify-between"
          accessible
          accessibilityLabel={infoLabel}
        >
          <View className="flex-row items-center gap-1">
            {hasAddedByInfo && (
              <>
                <View className="h-4 w-4 overflow-hidden rounded-full">
                  <BoringAvatar
                    name={item.addedByAvatarSeed || item.addedByName || item.addedBy}
                    variant={item.addedByAvatarVariant}
                    size={16}
                  />
                </View>
                <Text className="font-sans text-[10px] text-text-secondary">{shortTime}</Text>
              </>
            )}
          </View>
          {watchedFullText && (
            <View className="flex-row items-center gap-1">
              <MaterialIcons name="visibility" size={12} color={colors.icon} />
              <Text className="font-sans text-[10px] text-text-secondary">
                {watchedCount}/{memberCount}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
