import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { getPosterUrl } from '../../lib/tmdb/config';
import { getTVShowDetails } from '../../lib/tmdb/tv';
import { useEpisodeProgressStore } from '../../stores/episodeProgress.store';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface ContinueWatchingItem {
  showId: number;
  title: string;
  posterPath: string | null;
  seasonNumber: number;
  episodeNumber: number;
  isUpcoming: boolean;
}

export function ContinueWatchingRow() {
  const entries = useEpisodeProgressStore((state) => state.entries);
  const showIds = useMemo(() => useEpisodeProgressStore.getState().showIdsInProgress(), [entries]);
  const showIdsKey = showIds.join(',');

  const [items, setItems] = useState<ContinueWatchingItem[]>([]);

  useEffect(() => {
    if (!showIdsKey) {
      setItems([]);
      return;
    }
    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        showIds.map(async (showId) => {
          const last = useEpisodeProgressStore.getState().lastWatchedForShow(showId);
          if (!last) return null;

          try {
            const show = await getTVShowDetails(showId);
            const currentSeason = show.seasons.find(
              (season) => season.season_number === last.seasonNumber,
            );

            if (currentSeason && last.episodeNumber < currentSeason.episode_count) {
              return {
                showId,
                title: show.name,
                posterPath: show.poster_path,
                seasonNumber: last.seasonNumber,
                episodeNumber: last.episodeNumber + 1,
                isUpcoming: false,
              };
            }

            const nextSeason = show.seasons.find(
              (season) =>
                season.season_number === last.seasonNumber + 1 && season.episode_count > 0,
            );
            if (nextSeason) {
              return {
                showId,
                title: show.name,
                posterPath: show.poster_path,
                seasonNumber: nextSeason.season_number,
                episodeNumber: 1,
                isUpcoming: false,
              };
            }

            if (show.next_episode_to_air) {
              return {
                showId,
                title: show.name,
                posterPath: show.poster_path,
                seasonNumber: show.next_episode_to_air.season_number,
                episodeNumber: show.next_episode_to_air.episode_number,
                isUpcoming: true,
              };
            }

            return null;
          } catch {
            return null;
          }
        }),
      );

      if (!cancelled) {
        setItems(results.filter((item): item is ContinueWatchingItem => item !== null));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showIdsKey]);

  if (items.length === 0) return null;

  return (
    <View className="mt-section-gap">
      <View className="mb-stack-md px-margin-mobile">
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
          Continue Watching
        </Text>
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => String(item.showId)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
        renderItem={({ item }) => <ContinueWatchingCard item={item} />}
      />
    </View>
  );
}

function ContinueWatchingCard({ item }: { item: ContinueWatchingItem }) {
  const posterUri = getPosterUrl(item.posterPath, 'w342');

  return (
    <AnimatedPressable
      onPress={() =>
        router.push({ pathname: '/details/[id]', params: { id: String(item.showId), type: 'tv' } })
      }
      style={{ width: 180, aspectRatio: 2 / 3 }}
      className="overflow-hidden rounded-2xl"
    >
      <Image
        source={posterUri ? { uri: posterUri } : undefined}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        contentFit="cover"
      />
      <View className="absolute left-2 top-2 rounded-full border border-glass-border bg-background-blur px-2 py-1">
        <Text className="font-sans-bold text-[10px] uppercase text-text-primary">
          {item.isUpcoming ? 'Upcoming' : `S${item.seasonNumber} E${item.episodeNumber}`}
        </Text>
      </View>
      <View className="absolute bottom-0 left-0 right-0 bg-background-blur p-3">
        <Text className="font-sans-semibold text-title-md text-text-primary" numberOfLines={1}>
          {item.title}
        </Text>
        <Text className="font-sans text-caption text-on-surface-variant" numberOfLines={1}>
          {item.isUpcoming
            ? `Coming S${item.seasonNumber} E${item.episodeNumber}`
            : `Next: S${item.seasonNumber} E${item.episodeNumber}`}
        </Text>
      </View>
    </AnimatedPressable>
  );
}
