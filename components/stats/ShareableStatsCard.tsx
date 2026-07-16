import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { GenreCount, MonthActivity } from '../../lib/stats';

interface ShareableStatsCardProps {
  periodLabel: string;
  totalMinutes: number;
  movieCount: number;
  episodeCount: number;
  showCount: number;
  topGenres: GenreCount[];
  activity: MonthActivity[];
  activityYear: number;
}

function formatDuration(totalMinutes: number): { days: number; hours: number } {
  const totalHours = Math.floor(totalMinutes / 60);
  return { days: Math.floor(totalHours / 24), hours: totalHours % 24 };
}

function StatColumn({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1">
      <Text className="font-sans-bold text-headline-lg-mobile text-text-primary">{value}</Text>
      <Text className="font-sans text-caption text-text-secondary">{label}</Text>
    </View>
  );
}

export function ShareableStatsCard({
  periodLabel,
  totalMinutes,
  movieCount,
  episodeCount,
  showCount,
  topGenres,
  activity,
  activityYear,
}: ShareableStatsCardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US';
  const monthNarrow = (month: number) =>
    new Date(2000, month, 1).toLocaleDateString(locale, { month: 'narrow' });
  const { days, hours } = formatDuration(totalMinutes);
  const rankedGenres = topGenres.slice(0, 3);
  const hasActivity = activity.some((entry) => entry.count > 0);
  const maxActivity = Math.max(1, ...activity.map((entry) => entry.count));
  const peakMonth = activity.reduce(
    (peak, entry) => (entry.count > peak.count ? entry : peak),
    activity[0] ?? { month: 0, count: 0 },
  );

  return (
    <View className="overflow-hidden rounded-3xl" style={{ aspectRatio: 9 / 16 }}>
      <LinearGradient
        colors={['#201f1f', '#131313', '#0a0a0a']}
        style={{ flex: 1, padding: 32, justifyContent: 'space-between' }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="font-sans-bold text-label-caps text-primary-container">
              Previously
            </Text>
            <Text className="mt-1 font-sans text-caption text-text-secondary">
              {t('components.statsCard.recap', { period: periodLabel })}
            </Text>
          </View>
          <View className="h-9 w-9 items-center justify-center rounded-full border border-glass-border">
            <Text className="font-sans-bold text-caption text-primary-container">{'★'}</Text>
          </View>
        </View>

        <View className="gap-stack-lg">
          {/* Hero metric: narrative framing with an ambient gold glow behind it,
              the card's one "spotlight" moment per DESIGN.md's One Spotlight Rule. */}
          <View>
            <View
              className="absolute -left-10 -top-10 h-40 w-40 rounded-full"
              style={{ backgroundColor: 'rgba(245,196,81,0.16)' }}
            />
            <Text className="font-sans-bold text-display-xl-mobile text-text-primary">
              {t('stats.daysHours', { days, hours })}
            </Text>
            <Text className="font-sans text-body-md text-text-secondary">
              {t('components.statsCard.ofWatching')}
            </Text>
          </View>

          <View className="flex-row gap-stack-lg">
            <StatColumn value={movieCount} label={t('stats.movies')} />
            <StatColumn value={episodeCount} label={t('stats.episodes')} />
            <StatColumn value={showCount} label={t('stats.shows')} />
          </View>

          {rankedGenres.length > 0 && (
            <View className="gap-2">
              <Text className="font-sans text-[10px] uppercase tracking-widest text-text-secondary">
                {t('components.statsCard.topGenres')}
              </Text>
              {rankedGenres.map((genre, index) => (
                <View key={genre.genre} className="flex-row items-center gap-2">
                  <Text
                    className={`w-24 font-sans-bold text-caption ${
                      index === 0 ? 'text-primary-container' : 'text-text-primary'
                    }`}
                    numberOfLines={1}
                  >
                    {genre.genre}
                  </Text>
                  <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                    <View
                      className={`h-full rounded-full ${index === 0 ? 'bg-primary-container' : 'bg-outline'}`}
                      style={{ width: `${Math.max(6, genre.pct)}%` }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {hasActivity && (
            <View className="gap-2">
              <Text className="font-sans text-[10px] uppercase tracking-widest text-text-secondary">
                {t('components.statsCard.byMonth', { year: activityYear })}
              </Text>
              <View className="flex-row items-end gap-1" style={{ height: 36 }}>
                {activity.map((entry) => (
                  <View
                    key={entry.month}
                    className={`flex-1 rounded-full ${
                      entry.month === peakMonth.month && entry.count > 0
                        ? 'bg-primary-container'
                        : 'bg-surface-container-high'
                    }`}
                    style={{ height: Math.max(3, (entry.count / maxActivity) * 36) }}
                  />
                ))}
              </View>
              <View className="flex-row justify-between">
                {activity.map((entry) => (
                  <Text
                    key={entry.month}
                    className="w-2 text-center font-sans text-[8px] text-text-secondary"
                  >
                    {monthNarrow(entry.month)}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>

        <Text className="font-sans text-[10px] text-text-secondary opacity-60">
          {t('components.statsCard.dataFromTmdb')}
        </Text>
      </LinearGradient>
    </View>
  );
}
