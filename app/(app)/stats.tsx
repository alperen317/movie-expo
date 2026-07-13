import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import { ShareableStatsCard } from '../../components/stats/ShareableStatsCard';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { useStatsData } from '../../hooks/useStatsData';
import { filterInputByYear, monthlyActivity, summarizeStats } from '../../lib/stats';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

type Period = 'all' | 'year';

function formatTotalTime(totalMinutes: number): string {
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days === 0) return `${hours}h`;
  return `${days}d ${hours}h`;
}

export default function StatsScreen() {
  const currentYear = new Date().getFullYear();
  const isDecember = new Date().getMonth() === 11;

  const { input, isLoading } = useStatsData();
  const [period, setPeriod] = useState<Period>(isDecember ? 'year' : 'all');
  const [isSharing, setIsSharing] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const scopedInput = useMemo(
    () => (period === 'year' ? filterInputByYear(input, currentYear) : input),
    [input, period, currentYear],
  );
  const summary = useMemo(() => summarizeStats(scopedInput), [scopedInput]);
  const activity = useMemo(() => monthlyActivity(input, currentYear), [input, currentYear]);
  const maxActivity = Math.max(1, ...activity.map((entry) => entry.count));

  const hasData = summary.movieCount + summary.episodeCount > 0;

  const handleShare = async () => {
    if (!viewShotRef.current?.capture) return;
    try {
      setIsSharing(true);
      const uri = await viewShotRef.current.capture();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(uri);
    } catch {
      // Sharing is a non-critical nicety — fail silently rather than showing an error.
    } finally {
      setIsSharing(false);
    }
  };

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
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">Statistics</Text>
      </View>

      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      )}

      {!isLoading && !hasData && (
        <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
          <MaterialIcons name="bar-chart" size={32} color="#A1A1AA" />
          <Text className="text-title-md font-sans-semibold text-text-primary">No stats yet</Text>
          <Text className="text-center font-sans text-body-md text-text-secondary">
            Mark movies and episodes as watched to see your stats here.
          </Text>
        </View>
      )}

      {!isLoading && hasData && (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {isDecember && (
            <View className="flex-row items-center gap-2 rounded-2xl border border-primary-container bg-surface-container-low p-4">
              <MaterialIcons name="celebration" size={20} color="#f5c451" />
              <Text className="flex-1 font-sans-semibold text-body-md text-primary-container">
                Your Year Wrapped is ready
              </Text>
            </View>
          )}

          <View className="flex-row rounded-full border border-glass-border bg-surface-container-low p-1">
            <AnimatedPressable
              onPress={() => setPeriod('all')}
              className={`flex-1 items-center rounded-full py-2 ${period === 'all' ? 'bg-primary-container' : ''}`}
            >
              <Text
                className={`font-sans-semibold text-caption ${period === 'all' ? 'text-on-primary-container' : 'text-text-secondary'}`}
              >
                All Time
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => setPeriod('year')}
              className={`flex-1 items-center rounded-full py-2 ${period === 'year' ? 'bg-primary-container' : ''}`}
            >
              <Text
                className={`font-sans-semibold text-caption ${period === 'year' ? 'text-on-primary-container' : 'text-text-secondary'}`}
              >
                This Year
              </Text>
            </AnimatedPressable>
          </View>

          <View className="flex-row gap-gutter">
            <View className="flex-1 items-center gap-1 rounded-xl border border-glass-border bg-surface-container-low py-stack-md">
              <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
                {formatTotalTime(summary.totalMinutes)}
              </Text>
              <Text className="font-sans text-caption text-text-secondary">Watch time</Text>
            </View>
            <View className="flex-1 items-center gap-1 rounded-xl border border-glass-border bg-surface-container-low py-stack-md">
              <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
                {summary.movieCount}
              </Text>
              <Text className="font-sans text-caption text-text-secondary">Movies</Text>
            </View>
            <View className="flex-1 items-center gap-1 rounded-xl border border-glass-border bg-surface-container-low py-stack-md">
              <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
                {summary.episodeCount}
              </Text>
              <Text className="font-sans text-caption text-text-secondary">Episodes</Text>
            </View>
          </View>

          {summary.topGenres.length > 0 && (
            <View className="gap-stack-sm">
              <Text className="font-sans-semibold text-title-md text-text-primary">Genres</Text>
              <View className="gap-3 rounded-2xl border border-glass-border bg-surface-container-low p-4">
                {summary.topGenres.map((genre) => (
                  <View key={genre.genre} className="gap-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="font-sans text-body-md text-text-primary">{genre.genre}</Text>
                      <Text className="font-sans text-caption text-text-secondary">
                        {Math.round(genre.pct)}%
                      </Text>
                    </View>
                    <View className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                      <View
                        className="h-full rounded-full bg-primary-container"
                        style={{ width: `${genre.pct}%` }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View className="gap-stack-sm">
            <Text className="font-sans-semibold text-title-md text-text-primary">
              {currentYear} Activity
            </Text>
            <View
              className="flex-row items-end justify-between rounded-2xl border border-glass-border bg-surface-container-low p-4"
              style={{ height: 130 }}
            >
              {activity.map((entry) => (
                <View
                  key={entry.month}
                  className="flex-1 items-center gap-1"
                  style={{ height: 100, justifyContent: 'flex-end' }}
                >
                  <View
                    className="w-2 rounded-full bg-primary-container"
                    style={{ height: Math.max(4, (entry.count / maxActivity) * 70) }}
                  />
                  <Text className="font-sans text-[9px] text-text-secondary">
                    {MONTH_LABELS[entry.month]}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-stack-sm">
            <Text className="font-sans-semibold text-title-md text-text-primary">Share your recap</Text>
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
              <ShareableStatsCard
                periodLabel={period === 'year' ? String(currentYear) : 'All Time'}
                totalMinutes={summary.totalMinutes}
                movieCount={summary.movieCount}
                episodeCount={summary.episodeCount}
                topGenre={summary.topGenres[0]?.genre ?? null}
              />
            </ViewShot>
            <AnimatedPressable
              onPress={handleShare}
              disabled={isSharing}
              className="flex-row items-center justify-center gap-2 rounded-full bg-primary-container py-4"
            >
              {isSharing ? (
                <ActivityIndicator color="#3f2e00" />
              ) : (
                <>
                  <MaterialIcons name="share" size={20} color="#3f2e00" />
                  <Text className="font-sans-semibold text-title-md text-on-primary-container">
                    Share
                  </Text>
                </>
              )}
            </AnimatedPressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
