import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

interface ShareableStatsCardProps {
  periodLabel: string;
  totalMinutes: number;
  movieCount: number;
  episodeCount: number;
  topGenre: string | null;
}

function formatDuration(totalMinutes: number): { days: number; hours: number } {
  const totalHours = Math.floor(totalMinutes / 60);
  return { days: Math.floor(totalHours / 24), hours: totalHours % 24 };
}

export function ShareableStatsCard({
  periodLabel,
  totalMinutes,
  movieCount,
  episodeCount,
  topGenre,
}: ShareableStatsCardProps) {
  const { days, hours } = formatDuration(totalMinutes);

  return (
    <View className="overflow-hidden rounded-3xl" style={{ aspectRatio: 9 / 16 }}>
      <LinearGradient
        colors={['#201f1f', '#090909']}
        style={{ flex: 1, padding: 32, justifyContent: 'space-between' }}
      >
        <View>
          <Text className="font-sans-bold text-label-caps text-primary-container">CineLux</Text>
          <Text className="mt-1 font-sans text-caption text-text-secondary">{periodLabel} Recap</Text>
        </View>

        <View className="gap-stack-lg">
          <View>
            <Text className="font-sans-bold text-display-xl-mobile text-text-primary">
              {days}d {hours}h
            </Text>
            <Text className="font-sans text-body-md text-text-secondary">spent watching</Text>
          </View>

          <View className="flex-row gap-stack-lg">
            <View>
              <Text className="font-sans-bold text-headline-lg-mobile text-text-primary">
                {movieCount}
              </Text>
              <Text className="font-sans text-caption text-text-secondary">Movies</Text>
            </View>
            <View>
              <Text className="font-sans-bold text-headline-lg-mobile text-text-primary">
                {episodeCount}
              </Text>
              <Text className="font-sans text-caption text-text-secondary">Episodes</Text>
            </View>
          </View>

          {topGenre && (
            <View>
              <Text className="font-sans-bold text-title-md text-primary-container">{topGenre}</Text>
              <Text className="font-sans text-caption text-text-secondary">Top genre</Text>
            </View>
          )}
        </View>

        <Text className="font-sans text-[10px] text-text-secondary opacity-60">Data from TMDB</Text>
      </LinearGradient>
    </View>
  );
}
