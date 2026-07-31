import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { AnimatedPressable } from '../ui/AnimatedPressable';
import { getProfileUrl } from '../../lib/tmdb/config';
import { useThemeColors } from '../../lib/theme/useThemeColors';
import type { TMDBMultiSearchResult } from '../../lib/tmdb/types';

const AVATAR_SIZE = 48;

// Shorter than a media row (no poster to match), but the avatar keeps the same
// 16px gutter and 12px gap so names line up with the titles above them.
export const PERSON_ROW_HEIGHT = AVATAR_SIZE + 24;

export interface PersonResultItem {
  id: number;
  name: string;
  profilePath: string | null;
  // The titles TMDB lists this person as known for: the row's subtitle, and
  // the only thing that tells two same-named actors apart.
  knownFor: string[];
}

export function toPersonResultItem(result: TMDBMultiSearchResult): PersonResultItem | null {
  if (result.media_type !== 'person' || !result.name) return null;

  return {
    id: result.id,
    name: result.name,
    profilePath: result.profile_path ?? null,
    knownFor: (result.known_for ?? [])
      .map((credit) => credit.title ?? credit.name)
      .filter((title): title is string => Boolean(title)),
  };
}

export function PersonResultRow({ item }: { item: PersonResultItem }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const avatarUri = getProfileUrl(item.profilePath, 'w185');
  const subtitle = item.knownFor.slice(0, 2).join(' · ');

  return (
    <AnimatedPressable
      onPress={() => router.push({ pathname: '/actor/[id]', params: { id: String(item.id) } })}
      accessibilityRole="button"
      accessibilityLabel={t('a11y.openActor', { name: item.name })}
      style={{ height: PERSON_ROW_HEIGHT }}
      className="flex-row items-center gap-3 px-margin-mobile"
    >
      <View
        style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
        className="items-center justify-center overflow-hidden border border-glass-border bg-surface-container"
      >
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
            contentFit="cover"
          />
        ) : (
          <MaterialIcons name="person" size={22} color={colors.icon} />
        )}
      </View>

      <View className="flex-1 gap-1">
        <Text className="font-sans-semibold text-body-md text-text-primary" numberOfLines={1}>
          {item.name}
        </Text>
        {subtitle.length > 0 && (
          <Text className="font-sans text-caption text-on-surface-variant" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
    </AnimatedPressable>
  );
}
