import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { getPosterUrl, getStillUrl } from '../../lib/tmdb/config';
import type { MediaSeasonSummary } from '../../lib/tmdb/details';
import { getSeasonDetails } from '../../lib/tmdb/tv';
import type { TMDBSeasonEpisode } from '../../lib/tmdb/types';
import { episodeKey, useEpisodeProgressStore } from '../../stores/episodeProgress.store';

interface SeasonAccordionProps {
  tvId: number;
  season: MediaSeasonSummary;
}

export function SeasonAccordion({ tvId, season }: SeasonAccordionProps) {
  const [expanded, setExpanded] = useState(false);
  const [episodes, setEpisodes] = useState<TMDBSeasonEpisode[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribing to the raw entries map (not the isEpisodeWatched getter, whose
  // function reference never changes) is what makes this re-render on toggle.
  const entries = useEpisodeProgressStore((state) => state.entries);
  const toggleEpisode = useEpisodeProgressStore((state) => state.toggleEpisode);
  const markSeason = useEpisodeProgressStore((state) => state.markSeason);
  const unmarkSeason = useEpisodeProgressStore((state) => state.unmarkSeason);

  const isWatched = (episodeNumber: number) =>
    Boolean(entries[episodeKey(tvId, season.seasonNumber, episodeNumber)]);

  const watchedCount = episodes ? episodes.filter((ep) => isWatched(ep.episode_number)).length : 0;
  const totalCount = episodes?.length ?? season.episodeCount;
  const isFullyWatched = episodes !== null && totalCount > 0 && watchedCount === totalCount;

  const handleToggleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && episodes === null && !isLoading) {
      setIsLoading(true);
      setError(null);
      try {
        const details = await getSeasonDetails(tvId, season.seasonNumber);
        setEpisodes(details.episodes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load episodes.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleMarkSeason = () => {
    if (!episodes) return;
    const episodeNumbers = episodes.map((ep) => ep.episode_number);
    if (isFullyWatched) unmarkSeason(tvId, season.seasonNumber, episodeNumbers);
    else markSeason(tvId, season.seasonNumber, episodeNumbers);
  };

  const posterUri = getPosterUrl(season.posterPath, 'w185');

  return (
    <View className="overflow-hidden rounded-2xl border border-glass-border bg-background-blur">
      <Pressable onPress={handleToggleExpand} className="flex-row items-center gap-3 p-3">
        <View className="h-16 w-11 overflow-hidden rounded-lg bg-surface-container-high">
          {posterUri && (
            <Image source={{ uri: posterUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          )}
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-sans-semibold text-body-md text-text-primary" numberOfLines={1}>
            {season.name}
          </Text>
          <Text className="font-sans text-caption text-text-secondary">
            {episodes ? `${watchedCount}/${totalCount} watched` : `${season.episodeCount} episodes`}
          </Text>
        </View>
        <Pressable
          onPress={handleMarkSeason}
          disabled={!episodes}
          hitSlop={8}
          className={`h-9 w-9 items-center justify-center rounded-full ${
            isFullyWatched ? 'bg-primary-container' : 'border border-glass-border'
          }`}
        >
          <MaterialIcons
            name={isFullyWatched ? 'check-circle' : 'done-all'}
            size={18}
            color={isFullyWatched ? '#3f2e00' : '#FFFFFF'}
          />
        </Pressable>
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={22} color="#A1A1AA" />
      </Pressable>

      {expanded && (
        <View className="gap-2 border-t border-glass-border p-3">
          {isLoading && <ActivityIndicator color="#ffffff" />}
          {error && <Text className="font-sans text-caption text-error">{error}</Text>}
          {episodes?.map((episode) => {
            const watched = isWatched(episode.episode_number);
            const stillUri = getStillUrl(episode.still_path);
            return (
              <Pressable
                key={episode.id}
                onPress={() => toggleEpisode(tvId, season.seasonNumber, episode.episode_number)}
                className="flex-row items-center gap-3 rounded-xl p-2"
              >
                <View className="h-12 w-20 overflow-hidden rounded-lg bg-surface-container-high">
                  {stillUri && (
                    <Image
                      source={{ uri: stillUri }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  )}
                </View>
                <View className="flex-1 gap-1">
                  <Text
                    className="font-sans-semibold text-caption text-text-primary"
                    numberOfLines={1}
                  >
                    {episode.episode_number}. {episode.name}
                  </Text>
                  {episode.air_date && (
                    <Text className="font-sans text-[11px] text-text-secondary">
                      {episode.air_date}
                    </Text>
                  )}
                </View>
                <MaterialIcons
                  name={watched ? 'check-circle' : 'radio-button-unchecked'}
                  size={22}
                  color={watched ? '#f5c451' : '#A1A1AA'}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
