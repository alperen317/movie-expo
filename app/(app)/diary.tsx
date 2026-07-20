import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { buildDiarySections } from '../../lib/diary';
import { useThemeColors } from '../../lib/theme/useThemeColors';
import { getPosterUrl } from '../../lib/tmdb/config';
import type { WatchLogEntry } from '../../lib/supabase/watchLog';
import { useWatchLogStore } from '../../stores/watchLog.store';

function formatMonth(monthKey: string, locale: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

function formatDay(watchedAt: string, locale: string): string {
  return new Date(watchedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

function DiaryRow({
  entry,
  locale,
}: {
  entry: WatchLogEntry & { isRewatch: boolean };
  locale: string;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const posterUri = getPosterUrl(entry.posterPath, 'w185');
  const subtitle = [entry.genres[0], entry.year].filter(Boolean).join(' • ');

  return (
    <AnimatedPressable
      onPress={() =>
        router.push({
          pathname: '/details/[id]',
          params: { id: String(entry.id), type: entry.mediaType },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={t('a11y.openDetails', {
        title: entry.title,
        type: entry.mediaType === 'tv' ? t('a11y.typeTv') : t('a11y.typeMovie'),
      })}
      className="mb-stack-sm flex-row gap-3 rounded-2xl border border-glass-border bg-background-blur p-3"
    >
      <View className="h-24 w-16 overflow-hidden rounded-lg bg-surface-container-high">
        {posterUri && (
          <Image
            source={{ uri: posterUri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        )}
      </View>

      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-sans text-caption text-text-secondary">
            {formatDay(entry.watchedAt, locale)}
          </Text>
          {entry.isRewatch && (
            <View className="flex-row items-center gap-1">
              <MaterialIcons name="repeat" size={13} color={colors.icon} />
              <Text className="font-sans text-caption text-text-secondary">
                {t('diary.rewatch')}
              </Text>
            </View>
          )}
        </View>
        <Text className="font-sans-semibold text-body-md text-text-primary" numberOfLines={1}>
          {entry.title}
        </Text>
        {subtitle.length > 0 && (
          <Text className="font-sans text-caption text-text-secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        {entry.rating !== null && (
          <View className="flex-row items-center gap-1">
            <MaterialIcons name="star" size={14} color={colors.gold} />
            <Text className="font-sans-semibold text-caption text-text-primary">
              {entry.rating}/10
            </Text>
          </View>
        )}
        {entry.note && (
          <Text className="font-sans text-caption italic text-text-secondary" numberOfLines={2}>
            “{entry.note}”
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

export default function DiaryScreen() {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();

  const entries = useWatchLogStore((state) => state.entries);
  const isLoading = useWatchLogStore((state) => state.isLoading);
  const error = useWatchLogStore((state) => state.error);

  useEffect(() => {
    useWatchLogStore.getState().fetchWatchLog();
  }, []);

  const sections = useMemo(
    () =>
      buildDiarySections(entries).map((section) => ({
        title: formatMonth(section.monthKey, i18n.language),
        data: section.entries,
      })),
    [entries, i18n.language],
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-margin-mobile py-stack-md">
        <AnimatedPressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.back')}
          className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
          {t('diary.title')}
        </Text>
      </View>

      {isLoading && entries.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      )}

      {error && !isLoading && (
        <View className="flex-1 items-center justify-center px-margin-mobile">
          <Text className="text-center font-sans text-body-md text-text-primary">{error}</Text>
        </View>
      )}

      {!isLoading && !error && entries.length === 0 && (
        <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
          <MaterialIcons name="auto-stories" size={32} color={colors.icon} />
          <Text className="text-title-md font-sans-semibold text-text-primary">
            {t('diary.empty.title')}
          </Text>
          <Text className="text-center font-sans text-body-md text-text-secondary">
            {t('diary.empty.subtitle')}
          </Text>
        </View>
      )}

      {!error && entries.length > 0 && (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.logId}
          renderItem={({ item }) => <DiaryRow entry={item} locale={i18n.language} />}
          renderSectionHeader={({ section }) => (
            <Text className="bg-background pb-stack-sm pt-stack-md font-sans-bold text-label-caps uppercase text-text-secondary">
              {section.title}
            </Text>
          )}
          stickySectionHeadersEnabled
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
