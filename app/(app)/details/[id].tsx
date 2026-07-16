import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GalleryViewer } from '../../../components/details/GalleryViewer';
import i18n from '../../../lib/i18n';
import { TrailerModal } from '../../../components/details/TrailerModal';
import type { MediaCardItem } from '../../../components/home/MovieCard';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { SeasonAccordion } from '../../../components/watchLog/SeasonAccordion';
import { WatchLogSheet } from '../../../components/watchLog/WatchLogSheet';
import { getBackdropUrl, getLogoUrl, getProfileUrl } from '../../../lib/tmdb/config';
import { MediaDetails, toMovieDetails, toTVDetails } from '../../../lib/tmdb/details';
import { getMovieDetails } from '../../../lib/tmdb/movies';
import { getEffectiveRegion } from '../../../lib/tmdb/region';
import { getTVShowDetails } from '../../../lib/tmdb/tv';
import { useEpisodeProgressStore } from '../../../stores/episodeProgress.store';
import { useListsStore } from '../../../stores/lists.store';
import { useProfileStore } from '../../../stores/profile.store';
import { useToastStore } from '../../../stores/toast.store';
import { useWatchLogStore } from '../../../stores/watchLog.store';

function openUrlSafely(url: string) {
  Linking.openURL(url).catch(() => {
    useToastStore.getState().show(i18n.t('toasts.couldNotOpenLink'), 'error-outline');
  });
}

export default function DetailsScreen() {
  const { t } = useTranslation();
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isWatchSheetOpen, setIsWatchSheetOpen] = useState(false);

  const isFavorite = useListsStore((state) =>
    details ? state.isFavorite(details.mediaType, details.id) : false,
  );
  const isWatchlisted = useListsStore((state) =>
    details ? state.isInWatchlist(details.mediaType, details.id) : false,
  );
  const toggleFavorite = useListsStore((state) => state.toggleFavorite);
  const toggleWatchlist = useListsStore((state) => state.toggleWatchlist);
  const isWatched = useWatchLogStore((state) =>
    details ? state.isWatched(details.mediaType, details.id) : false,
  );
  const region = getEffectiveRegion(useProfileStore((state) => state.profile?.watchRegion));

  const cardItem: MediaCardItem | null = useMemo(() => {
    if (!details) return null;
    return {
      id: details.id,
      title: details.title,
      year: details.year,
      posterPath: details.posterPath,
      voteAverage: details.voteAverage,
      genre: details.genres[0] ?? null,
      mediaType: details.mediaType,
    };
  }, [details]);

  useEffect(() => {
    useWatchLogStore.getState().fetchWatchLog();
    useEpisodeProgressStore.getState().fetchProgress();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const media =
          mediaType === 'tv'
            ? toTVDetails(await getTVShowDetails(Number(id)), region)
            : toMovieDetails(await getMovieDetails(Number(id)), region);
        if (!cancelled) setDetails(media);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('details.loadError'));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, mediaType, region]);

  const backdropUri = getBackdropUrl(details?.backdropPath ?? null, 'w1280');
  const metaParts = [details?.year, details?.runtimeLabel, details?.certification].filter(
    Boolean,
  ) as string[];

  const heroHeight = windowHeight * 0.55;

  return (
    <View className="flex-1 bg-background">
      {backdropUri && (
        <>
          <Image
            source={{ uri: backdropUri }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: heroHeight }}
            contentFit="cover"
          />
          <LinearGradient
            colors={['rgba(19,19,19,0.85)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: heroHeight * 0.6 }}
          />
          <LinearGradient
            colors={['transparent', 'rgba(19,19,19,0.9)', '#131313']}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: heroHeight * 0.25,
              height: heroHeight * 0.75,
            }}
          />
        </>
      )}

      <View
        style={{ paddingTop: insets.top + 12 }}
        className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-margin-mobile"
      >
        <AnimatedPressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.back')}
          className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
        >
          <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => cardItem && toggleFavorite(cardItem)}
          accessibilityRole="button"
          accessibilityState={{ selected: isFavorite }}
          accessibilityLabel={t(isFavorite ? 'a11y.removeFromFavorites' : 'a11y.addToFavorites', {
            title: details?.title ?? '',
          })}
          className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
        >
          <MaterialIcons
            name={isFavorite ? 'favorite' : 'favorite-border'}
            size={20}
            color="#FF6B6B"
          />
        </AnimatedPressable>
      </View>

      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      )}

      {error && !isLoading && (
        <View className="flex-1 items-center justify-center px-margin-mobile">
          <Text className="text-center font-sans text-body-md text-text-primary">{error}</Text>
        </View>
      )}

      {details && !isLoading && !error && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: heroHeight * 0.75, paddingBottom: 64 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-stack-lg px-margin-mobile">
            <View className="gap-stack-sm">
              <View className="flex-row flex-wrap items-center gap-2">
                <MaterialIcons name="star" size={16} color="#f5c451" />
                <Text className="font-sans-bold text-label-caps text-primary-container">
                  {details.voteAverage.toFixed(1)}
                </Text>
                {metaParts.length > 0 && (
                  <Text className="ml-2 font-sans text-caption text-text-secondary">
                    {metaParts.join(' • ')}
                  </Text>
                )}
              </View>

              <Text className="text-display-xl-mobile text-text-primary">{details.title}</Text>

              {details.genres.length > 0 && (
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {details.genres.map((genre) => (
                    <View
                      key={genre}
                      className="rounded-full border border-glass-border bg-background-blur px-3 py-1"
                    >
                      <Text className="font-sans text-caption text-text-primary">{genre}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View className="gap-stack-sm">
              {details.trailerKey && (
                <Pressable
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      openUrlSafely(`https://www.youtube.com/watch?v=${details.trailerKey}`);
                    } else {
                      setIsTrailerOpen(true);
                    }
                  }}
                  className="flex-row items-center justify-center gap-2 rounded-full bg-primary-container py-4"
                >
                  <MaterialIcons name="play-arrow" size={22} color="#3f2e00" />
                  <Text className="font-sans-semibold text-title-md text-on-primary-container">
                    {t('details.watchTrailer')}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setIsWatchSheetOpen(true)}
                className={`flex-row items-center justify-center gap-2 rounded-full py-4 ${
                  isWatched
                    ? 'bg-primary-container'
                    : 'border border-glass-border bg-background-blur'
                }`}
              >
                <MaterialIcons
                  name={isWatched ? 'check-circle' : 'visibility'}
                  size={22}
                  color={isWatched ? '#3f2e00' : '#FFFFFF'}
                />
                <Text
                  className={`font-sans-semibold text-title-md ${
                    isWatched ? 'text-on-primary-container' : 'text-text-primary'
                  }`}
                >
                  {isWatched ? t('details.watched') : t('details.markAsWatched')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => cardItem && toggleWatchlist(cardItem)}
                className="flex-row items-center justify-center gap-2 rounded-full border border-glass-border bg-background-blur py-4"
              >
                <MaterialIcons name={isWatchlisted ? 'check' : 'add'} size={22} color="#FFFFFF" />
                <Text className="font-sans-semibold text-title-md text-text-primary">
                  {isWatchlisted ? t('details.inWatchlist') : t('details.addToWatchlist')}
                </Text>
              </Pressable>
            </View>

            {details.watchProviders && (
              <View className="gap-stack-sm">
                <Text className="font-sans-semibold text-title-md text-text-primary">
                  {t('details.whereToWatch')}
                </Text>
                <Pressable
                  onPress={() => openUrlSafely(details.watchProviders!.link)}
                  className="flex-row flex-wrap items-center gap-2"
                >
                  {(details.watchProviders.flatrate.length > 0
                    ? details.watchProviders.flatrate
                    : details.watchProviders.rent.length > 0
                      ? details.watchProviders.rent
                      : details.watchProviders.buy
                  ).map((provider) => (
                    <View
                      key={provider.id}
                      className="h-12 w-12 overflow-hidden rounded-xl border border-glass-border"
                    >
                      <Image
                        source={
                          getLogoUrl(provider.logoPath, 'w92')
                            ? { uri: getLogoUrl(provider.logoPath, 'w92')! }
                            : undefined
                        }
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    </View>
                  ))}
                </Pressable>
                <Text className="font-sans text-[11px] text-text-secondary">
                  {t('details.justWatchAttribution')}
                </Text>
              </View>
            )}

            {details.mediaType === 'tv' && details.seasons.length > 0 && (
              <View className="gap-stack-sm">
                <Text className="font-sans-semibold text-title-md text-text-primary">
                  {t('details.seasons')}
                </Text>
                <View className="gap-stack-sm">
                  {details.seasons.map((season) => (
                    <SeasonAccordion
                      key={season.seasonNumber}
                      tvId={details.id}
                      season={season}
                      allSeasons={details.seasons}
                    />
                  ))}
                </View>
              </View>
            )}

            <BlurView intensity={30} tint="dark" style={{ borderRadius: 24, overflow: 'hidden' }}>
              <View className="gap-stack-lg border border-glass-border bg-background-blur p-stack-md">
                <View className="gap-stack-sm">
                  <Text className="font-sans-semibold text-title-md text-text-primary">
                    {t('details.synopsis')}
                  </Text>
                  <Text className="font-sans text-body-md leading-relaxed text-text-secondary">
                    {details.overview}
                  </Text>
                </View>

                <GalleryViewer backdrops={details.backdrops} />

                {details.cast.length > 0 && (
                  <View className="gap-stack-sm">
                    <Text className="font-sans-semibold text-title-md text-text-primary">
                      {t('details.cast')}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View className="flex-row gap-stack-md">
                        {details.cast.map((member) => {
                          const profileUri = getProfileUrl(member.profilePath, 'w185');
                          return (
                            <AnimatedPressable
                              key={member.id}
                              onPress={() =>
                                router.push({
                                  pathname: '/actor/[id]',
                                  params: { id: String(member.id) },
                                })
                              }
                              accessibilityRole="button"
                              accessibilityLabel={t('a11y.openActor', { name: member.name })}
                              className="w-20 items-center gap-2"
                            >
                              <View className="h-16 w-16 overflow-hidden rounded-full border border-glass-border">
                                {profileUri ? (
                                  <Image
                                    source={{ uri: profileUri }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                  />
                                ) : (
                                  <View className="h-full w-full items-center justify-center bg-surface-container-high">
                                    <MaterialIcons name="person" size={24} color="#A1A1AA" />
                                  </View>
                                )}
                              </View>
                              <Text
                                className="text-center font-sans text-caption text-text-primary"
                                numberOfLines={2}
                              >
                                {member.name}
                              </Text>
                            </AnimatedPressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            </BlurView>
          </View>
        </ScrollView>
      )}

      <TrailerModal
        visible={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
        trailerKey={details?.trailerKey ?? null}
      />

      {cardItem && (
        <WatchLogSheet
          visible={isWatchSheetOpen}
          item={cardItem}
          onClose={() => setIsWatchSheetOpen(false)}
          seasons={details?.mediaType === 'tv' ? details.seasons : undefined}
        />
      )}
    </View>
  );
}
