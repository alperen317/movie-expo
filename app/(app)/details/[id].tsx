import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import type { MediaCardItem } from '../../../components/home/MovieCard';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { getBackdropUrl, getProfileUrl } from '../../../lib/tmdb/config';
import { MediaDetails, toMovieDetails, toTVDetails } from '../../../lib/tmdb/details';
import { getMovieDetails } from '../../../lib/tmdb/movies';
import { getTVShowDetails } from '../../../lib/tmdb/tv';
import { useListsStore } from '../../../stores/lists.store';

export default function DetailsScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);

  const isFavorite = useListsStore((state) =>
    details ? state.isFavorite(details.mediaType, details.id) : false,
  );
  const isWatchlisted = useListsStore((state) =>
    details ? state.isInWatchlist(details.mediaType, details.id) : false,
  );
  const toggleFavorite = useListsStore((state) => state.toggleFavorite);
  const toggleWatchlist = useListsStore((state) => state.toggleWatchlist);

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
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const media =
          mediaType === 'tv'
            ? toTVDetails(await getTVShowDetails(Number(id)))
            : toMovieDetails(await getMovieDetails(Number(id)));
        if (!cancelled) setDetails(media);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load details.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, mediaType]);

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
          className="h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
        >
          <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => cardItem && toggleFavorite(cardItem)}
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
                      Linking.openURL(`https://www.youtube.com/watch?v=${details.trailerKey}`);
                    } else {
                      setIsTrailerOpen(true);
                    }
                  }}
                  className="flex-row items-center justify-center gap-2 rounded-full bg-primary-container py-4"
                >
                  <MaterialIcons name="play-arrow" size={22} color="#3f2e00" />
                  <Text className="font-sans-semibold text-title-md text-on-primary-container">
                    Watch Trailer
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => cardItem && toggleWatchlist(cardItem)}
                className="flex-row items-center justify-center gap-2 rounded-full border border-glass-border bg-background-blur py-4"
              >
                <MaterialIcons
                  name={isWatchlisted ? 'check' : 'add'}
                  size={22}
                  color="#FFFFFF"
                />
                <Text className="font-sans-semibold text-title-md text-text-primary">
                  {isWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}
                </Text>
              </Pressable>
            </View>

            <BlurView intensity={30} tint="dark" style={{ borderRadius: 24, overflow: 'hidden' }}>
              <View className="gap-stack-lg border border-glass-border bg-background-blur p-stack-md">
                <View className="gap-stack-sm">
                  <Text className="font-sans-semibold text-title-md text-text-primary">
                    Synopsis
                  </Text>
                  <Text className="font-sans text-body-md leading-relaxed text-text-secondary">
                    {details.overview}
                  </Text>
                </View>

                {details.backdrops.length > 0 && (
                  <View className="gap-stack-sm">
                    <Text className="font-sans-semibold text-title-md text-text-primary">
                      Gallery
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View className="flex-row gap-stack-md">
                        {details.backdrops.map((path, index) => {
                          const imageUri = getBackdropUrl(path, 'w780');
                          if (!imageUri) return null;
                          return (
                            <AnimatedPressable
                              key={path}
                              onPress={() => setViewerIndex(index)}
                              className="overflow-hidden rounded-lg border border-glass-border"
                              style={{ width: 220, height: 124 }}
                            >
                              <Image
                                source={{ uri: imageUri }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                              />
                            </AnimatedPressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {details.cast.length > 0 && (
                  <View className="gap-stack-sm">
                    <Text className="font-sans-semibold text-title-md text-text-primary">
                      Cast
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

      <Modal
        visible={viewerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerIndex(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <AnimatedPressable
            onPress={() => setViewerIndex(null)}
            style={{ paddingTop: insets.top, marginTop: 12 }}
            className="absolute right-4 top-0 z-10 h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
          >
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </AnimatedPressable>

          {viewerIndex !== null && details && (
            <FlatList
              data={details.backdrops}
              horizontal
              pagingEnabled
              initialScrollIndex={viewerIndex}
              getItemLayout={(_, index) => ({
                length: windowWidth,
                offset: windowWidth * index,
                index,
              })}
              keyExtractor={(path) => path}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const imageUri = getBackdropUrl(item, 'original');
                return (
                  <View
                    style={{ width: windowWidth, height: windowHeight, justifyContent: 'center' }}
                  >
                    {imageUri && (
                      <Animated.View entering={ZoomIn.duration(250)}>
                        <Image
                          source={{ uri: imageUri }}
                          style={{ width: windowWidth, height: (windowWidth * 9) / 16 }}
                          contentFit="contain"
                        />
                      </Animated.View>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      </Modal>

      <Modal
        visible={isTrailerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTrailerOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <AnimatedPressable
            onPress={() => setIsTrailerOpen(false)}
            style={{ paddingTop: insets.top, marginTop: 12 }}
            className="absolute right-4 top-0 z-10 h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-background-blur"
          >
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </AnimatedPressable>

          {isTrailerOpen && details?.trailerKey && (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View style={{ width: windowWidth, height: (windowWidth * 9) / 16 }}>
                <WebView
                  source={{
                    uri: `https://www.youtube.com/embed/${details.trailerKey}?autoplay=1&playsinline=1&modestbranding=1&rel=0`,
                  }}
                  style={{ flex: 1, backgroundColor: '#000000' }}
                  allowsFullscreenVideo
                  mediaPlaybackRequiresUserAction={false}
                  startInLoadingState
                  renderLoading={() => (
                    <View
                      style={StyleSheet.absoluteFill}
                      className="items-center justify-center bg-black"
                    >
                      <ActivityIndicator color="#ffffff" />
                    </View>
                  )}
                />
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
