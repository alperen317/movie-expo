import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import { ShareableStatsCard } from '../../components/stats/ShareableStatsCard';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { useStatsData } from '../../hooks/useStatsData';
import { filterInputByYear, monthlyActivity, summarizeStats } from '../../lib/stats';
import { useThemeColors } from '../../lib/theme/useThemeColors';

type Period = 'all' | 'year';

export default function StatsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const currentYear = new Date().getFullYear();
  const isDecember = new Date().getMonth() === 11;

  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US';
  const monthNarrow = (month: number) =>
    new Date(2000, month, 1).toLocaleDateString(locale, { month: 'narrow' });
  const monthLong = (month: number) =>
    new Date(2000, month, 1).toLocaleDateString(locale, { month: 'long' });

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
  const peakMonth = activity.reduce(
    (peak, entry) => (entry.count > peak.count ? entry : peak),
    activity[0] ?? { month: 0, count: 0 },
  );

  const hasData = summary.movieCount + summary.episodeCount > 0;

  const lifeDaysWhole = Math.floor(summary.lifeDays);
  const lifeHoursRemainder = Math.floor(summary.lifeHours % 24);

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
          accessibilityRole="button"
          accessibilityLabel={t('a11y.back')}
          className="h-8 w-8 items-center justify-center"
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
          {t('stats.title')}
        </Text>
      </View>

      {isLoading && (
        <View className="gap-stack-md px-margin-mobile pt-stack-sm">
          <View className="h-11 rounded-full bg-surface-container-low" />
          <View className="h-32 rounded-xl bg-surface-container-low" />
          <View className="flex-row gap-gutter">
            <View className="h-20 flex-1 rounded-xl bg-surface-container-low" />
            <View className="h-20 flex-1 rounded-xl bg-surface-container-low" />
            <View className="h-20 flex-1 rounded-xl bg-surface-container-low" />
          </View>
          <View className="h-40 rounded-xl bg-surface-container-low" />
        </View>
      )}

      {!isLoading && !hasData && (
        <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
          <MaterialIcons name="bar-chart" size={32} color={colors.icon} />
          <Text className="text-title-md font-sans-semibold text-text-primary">
            {t('stats.emptyTitle')}
          </Text>
          <Text className="text-center font-sans text-body-md text-text-secondary">
            {t('stats.emptySubtitle')}
          </Text>
        </View>
      )}

      {!isLoading && hasData && (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {isDecember && (
            <View className="flex-row items-center gap-2 overflow-hidden rounded-xl border border-primary-container/40 bg-primary-container/10 p-4">
              <MaterialIcons name="auto-awesome" size={20} color={colors.gold} />
              <Text className="flex-1 font-sans-semibold text-body-md text-primary-container">
                {t('stats.yearWrapped')}
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
                {t('stats.allTime')}
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => setPeriod('year')}
              className={`flex-1 items-center rounded-full py-2 ${period === 'year' ? 'bg-primary-container' : ''}`}
            >
              <Text
                className={`font-sans-semibold text-caption ${period === 'year' ? 'text-on-primary-container' : 'text-text-secondary'}`}
              >
                {t('stats.thisYear')}
              </Text>
            </AnimatedPressable>
          </View>

          {/* Hero metric: the screen's one spotlight moment (ambient gold glow,
              narrative framing) — everything below is quieter by comparison. */}
          <View className="overflow-hidden rounded-xl border border-primary-container/30 bg-surface-container-low p-5">
            <View
              className="absolute -right-8 -top-12 h-36 w-36 rounded-full"
              style={{ backgroundColor: 'rgba(245,196,81,0.14)' }}
            />
            <Text className="font-sans text-caption text-text-secondary">
              {period === 'year' ? t('stats.heroYear', { year: currentYear }) : t('stats.heroLife')}
            </Text>
            <Text className="mt-1 text-display-xl-mobile font-sans-bold text-text-primary">
              {t('stats.daysHours', { days: lifeDaysWhole, hours: lifeHoursRemainder })}
            </Text>
            <Text className="font-sans text-body-md text-text-secondary">
              {t('stats.heroSuffix')}
            </Text>
          </View>

          <View className="flex-row gap-gutter">
            <View className="flex-1 items-center gap-1 rounded-xl border border-glass-border bg-surface-container-low py-stack-md">
              <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
                {summary.movieCount}
              </Text>
              <Text className="font-sans text-caption text-text-secondary">
                {t('stats.movies')}
              </Text>
            </View>
            <View className="flex-1 items-center gap-1 rounded-xl border border-glass-border bg-surface-container-low py-stack-md">
              <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
                {summary.episodeCount}
              </Text>
              <Text className="font-sans text-caption text-text-secondary">
                {t('stats.episodes')}
              </Text>
            </View>
            <View className="flex-1 items-center gap-1 rounded-xl border border-glass-border bg-surface-container-low py-stack-md">
              <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
                {summary.showCount}
              </Text>
              <Text className="font-sans text-caption text-text-secondary">{t('stats.shows')}</Text>
            </View>
          </View>

          {summary.topGenres.length > 0 && (
            <View className="gap-stack-sm">
              <Text className="font-sans-semibold text-title-md text-text-primary">
                {t('stats.genres')}
              </Text>
              <View className="gap-3 rounded-xl border border-glass-border bg-surface-container-low p-4">
                {summary.topGenres.map((genre, index) => (
                  <View key={genre.genre} className="gap-1">
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={`font-sans text-body-md ${index === 0 ? 'font-sans-semibold text-primary-container' : 'text-text-primary'}`}
                      >
                        {genre.genre}
                      </Text>
                      <Text className="font-sans text-caption text-text-secondary">
                        {Math.round(genre.pct)}%
                      </Text>
                    </View>
                    <View className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                      <View
                        className={`h-full rounded-full ${index === 0 ? 'bg-primary-container' : 'bg-outline'}`}
                        style={{ width: `${genre.pct}%` }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View className="gap-stack-sm">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans-semibold text-title-md text-text-primary">
                {t('stats.activity', { year: currentYear })}
              </Text>
              {peakMonth.count > 0 && (
                <View className="flex-row items-center gap-1">
                  <MaterialIcons name="local-fire-department" size={14} color={colors.gold} />
                  <Text className="font-sans text-caption text-primary-container">
                    {t('stats.peakIn', { month: monthLong(peakMonth.month) })}
                  </Text>
                </View>
              )}
            </View>
            <View
              className="flex-row items-end justify-between rounded-xl border border-glass-border bg-surface-container-low p-4"
              style={{ height: 130 }}
            >
              {activity.map((entry) => (
                <View
                  key={entry.month}
                  className="flex-1 items-center gap-1"
                  style={{ height: 100, justifyContent: 'flex-end' }}
                >
                  <View
                    className={`w-2 rounded-full ${
                      entry.month === peakMonth.month && entry.count > 0
                        ? 'bg-primary-container'
                        : 'bg-outline'
                    }`}
                    style={{ height: Math.max(4, (entry.count / maxActivity) * 70) }}
                  />
                  <Text className="font-sans text-[9px] text-text-secondary">
                    {monthNarrow(entry.month)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-stack-sm">
            <Text className="font-sans-semibold text-title-md text-text-primary">
              {t('stats.shareRecap')}
            </Text>
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
              <ShareableStatsCard
                periodLabel={period === 'year' ? String(currentYear) : t('stats.allTime')}
                totalMinutes={summary.totalMinutes}
                movieCount={summary.movieCount}
                episodeCount={summary.episodeCount}
                showCount={summary.showCount}
                topGenres={summary.topGenres}
                activity={activity}
                activityYear={currentYear}
              />
            </ViewShot>
            <AnimatedPressable
              onPress={handleShare}
              disabled={isSharing}
              className="flex-row items-center justify-center gap-2 rounded-full bg-primary-container py-4"
              style={{
                shadowColor: '#F5C451',
                shadowOpacity: 0.35,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              {isSharing ? (
                <ActivityIndicator color="#3f2e00" />
              ) : (
                <>
                  <MaterialIcons name="ios-share" size={20} color="#3f2e00" />
                  <Text className="font-sans-semibold text-title-md text-on-primary-container">
                    {t('stats.share')}
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
