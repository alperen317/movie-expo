import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import type { GenreCount, MonthActivity } from '../../lib/stats';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

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
              {periodLabel} Recap
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
              {days}d {hours}h
            </Text>
            <Text className="font-sans text-body-md text-text-secondary">
              of watching, together
            </Text>
          </View>

          <View className="flex-row gap-stack-lg">
            <StatColumn value={movieCount} label="Movies" />
            <StatColumn value={episodeCount} label="Episodes" />
            <StatColumn value={showCount} label="Shows" />
          </View>

          {rankedGenres.length > 0 && (
            <View className="gap-2">
              <Text className="font-sans text-[10px] uppercase tracking-widest text-text-secondary">
                Top Genres
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
                {activityYear} by month
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
                {MONTH_LABELS.map((label, index) => (
                  <Text
                    key={index}
                    className="w-2 text-center font-sans text-[8px] text-text-secondary"
                  >
                    {label}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>

        <Text className="font-sans text-[10px] text-text-secondary opacity-60">Data from TMDB</Text>
      </LinearGradient>
    </View>
  );
}
