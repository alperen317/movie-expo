import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { requestEpisodeReminderPermission } from '../../lib/notifications/episodeReminders';
import { getPosterUrl } from '../../lib/tmdb/config';
import { getTVShowDetails } from '../../lib/tmdb/tv';
import { useEpisodeProgressStore } from '../../stores/episodeProgress.store';

interface UpcomingEpisode {
  showId: number;
  title: string;
  posterPath: string | null;
  seasonNumber: number;
  episodeNumber: number;
  airDate: string;
}

function formatAirDate(airDate: string, t: TFunction, language: string): string {
  const date = new Date(`${airDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return t('calendar.today');
  if (diffDays === 1) return t('calendar.tomorrow');
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';
  return date.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const entries = useEpisodeProgressStore((state) => state.entries);
  const showIds = useMemo(() => useEpisodeProgressStore.getState().showIdsInProgress(), [entries]);
  const showIdsKey = showIds.join(',');

  const [episodes, setEpisodes] = useState<UpcomingEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    requestEpisodeReminderPermission();
  }, []);

  useEffect(() => {
    if (!showIdsKey) {
      setEpisodes([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const results = await Promise.all(
        showIds.map(async (showId) => {
          try {
            const show = await getTVShowDetails(showId);
            const next = show.next_episode_to_air;
            if (!next?.air_date) return null;

            return {
              showId,
              title: show.name,
              posterPath: show.poster_path,
              seasonNumber: next.season_number,
              episodeNumber: next.episode_number,
              airDate: next.air_date,
            };
          } catch {
            return null;
          }
        }),
      );

      if (!cancelled) {
        const upcoming = results
          .filter((item): item is UpcomingEpisode => item !== null)
          .sort((a, b) => a.airDate.localeCompare(b.airDate));
        setEpisodes(upcoming);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showIdsKey]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-margin-mobile py-stack-md">
        <AnimatedPressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center"
        >
          <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
        </AnimatedPressable>
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
          {t('calendar.title')}
        </Text>
      </View>

      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      )}

      {!isLoading && episodes.length === 0 && (
        <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
          <MaterialIcons name="event-available" size={32} color="#A1A1AA" />
          <Text className="text-title-md font-sans-semibold text-text-primary">
            {t('calendar.emptyTitle')}
          </Text>
          <Text className="text-center font-sans text-body-md text-text-secondary">
            {t('calendar.emptySubtitle')}
          </Text>
        </View>
      )}

      {!isLoading && episodes.length > 0 && (
        <FlatList
          data={episodes}
          keyExtractor={(item) => String(item.showId)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <AnimatedPressable
              onPress={() =>
                router.push({
                  pathname: '/details/[id]',
                  params: { id: String(item.showId), type: 'tv' },
                })
              }
              className="flex-row items-center gap-3 rounded-2xl border border-glass-border bg-surface-container-low p-3"
            >
              <View
                style={{ width: 56, aspectRatio: 2 / 3 }}
                className="overflow-hidden rounded-lg"
              >
                <Image
                  source={
                    getPosterUrl(item.posterPath, 'w185')
                      ? { uri: getPosterUrl(item.posterPath, 'w185')! }
                      : undefined
                  }
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              </View>
              <View className="flex-1 gap-1">
                <Text
                  className="font-sans-semibold text-title-md text-text-primary"
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text className="font-sans text-caption text-text-secondary">
                  S{item.seasonNumber} E{item.episodeNumber}
                </Text>
              </View>
              <Text className="font-sans-semibold text-caption text-primary-container">
                {formatAirDate(item.airDate, t, i18n.language)}
              </Text>
            </AnimatedPressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
