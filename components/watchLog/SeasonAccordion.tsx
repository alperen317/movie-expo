import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { getPosterUrl, getStillUrl } from '../../lib/tmdb/config';
import type { MediaSeasonSummary } from '../../lib/tmdb/details';
import { getSeasonDetails } from '../../lib/tmdb/tv';
import type { TMDBSeasonEpisode } from '../../lib/tmdb/types';
import { episodeKey, useEpisodeProgressStore } from '../../stores/episodeProgress.store';
import { ActionSheetModal } from '../ui/ActionSheetModal';
import { useThemeColors } from '../../lib/theme/useThemeColors';

interface SeasonAccordionProps {
  tvId: number;
  season: MediaSeasonSummary;
  allSeasons: MediaSeasonSummary[];
}

export function SeasonAccordion({ tvId, season, allSeasons }: SeasonAccordionProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const [episodes, setEpisodes] = useState<TMDBSeasonEpisode[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMarkUpToHereConfirmOpen, setIsMarkUpToHereConfirmOpen] = useState(false);

  // Subscribing to the raw entries map (not the isEpisodeWatched getter, whose
  // function reference never changes) is what makes this re-render on toggle.
  const entries = useEpisodeProgressStore((state) => state.entries);
  const toggleEpisode = useEpisodeProgressStore((state) => state.toggleEpisode);
  const markSeason = useEpisodeProgressStore((state) => state.markSeason);
  const markUpToSeason = useEpisodeProgressStore((state) => state.markUpToSeason);
  const unmarkSeason = useEpisodeProgressStore((state) => state.unmarkSeason);

  const isWatched = (episodeNumber: number) =>
    Boolean(entries[episodeKey(tvId, season.seasonNumber, episodeNumber)]);

  // Before the accordion is expanded `episodes` is null (TMDB episode list
  // hasn't been fetched yet), so fall back to counting progress entries for
  // this season directly — otherwise the "fully watched" badge stays stale
  // (grey) until the user opens and closes the accordion once.
  const watchedCountFromStore = Object.values(entries).filter(
    (entry) => entry.showId === tvId && entry.seasonNumber === season.seasonNumber,
  ).length;

  const watchedCount = episodes
    ? episodes.filter((ep) => isWatched(ep.episode_number)).length
    : watchedCountFromStore;
  const totalCount = episodes?.length ?? season.episodeCount;
  const isFullyWatched = totalCount > 0 && watchedCount === totalCount;

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
        setError(err instanceof Error ? err.message : t('components.seasonAccordion.loadError'));
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

  const firstSeasonNumber = allSeasons[0]?.seasonNumber ?? season.seasonNumber;
  const isOnlySeason = allSeasons.length <= 1;
  const markUpToHereTitle =
    firstSeasonNumber === season.seasonNumber
      ? t('components.seasonAccordion.markSeasonTitle', { season: season.seasonNumber })
      : t('components.seasonAccordion.markSeasonsTitle', {
          from: firstSeasonNumber,
          to: season.seasonNumber,
        });

  const posterUri = getPosterUrl(season.posterPath, 'w185');

  return (
    <View className="overflow-hidden rounded-2xl border border-glass-border bg-background-blur">
      <Pressable onPress={handleToggleExpand} className="flex-row items-center gap-3 p-3">
        <View className="h-16 w-11 overflow-hidden rounded-lg bg-surface-container-high">
          {posterUri && (
            <Image
              source={{ uri: posterUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          )}
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-sans-semibold text-body-md text-text-primary" numberOfLines={1}>
            {season.name}
          </Text>
          <Text className="font-sans text-caption text-text-secondary">
            {watchedCount > 0
              ? t('components.seasonAccordion.watchedCount', {
                  watched: watchedCount,
                  total: totalCount,
                })
              : t('components.seasonAccordion.episodeCount', { count: totalCount })}
          </Text>
        </View>
        {!isOnlySeason && (
          <Pressable
            onPress={() => setIsMarkUpToHereConfirmOpen(true)}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full border border-glass-border"
          >
            <MaterialIcons name="playlist-add-check" size={18} color={colors.textPrimary} />
          </Pressable>
        )}
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
            color={isFullyWatched ? '#3f2e00' : colors.textPrimary}
          />
        </Pressable>
        <MaterialIcons
          name={expanded ? 'expand-less' : 'expand-more'}
          size={22}
          color={colors.icon}
        />
      </Pressable>

      <ActionSheetModal
        visible={isMarkUpToHereConfirmOpen}
        title={markUpToHereTitle}
        message={t('components.seasonAccordion.markUpToMessage', { season: season.seasonNumber })}
        onClose={() => setIsMarkUpToHereConfirmOpen(false)}
        actions={[
          {
            label: t('components.seasonAccordion.markWatched'),
            onPress: () => markUpToSeason(tvId, allSeasons, season.seasonNumber),
          },
        ]}
      />

      {expanded && (
        <View className="gap-2 border-t border-glass-border p-3">
          {isLoading && <ActivityIndicator color={colors.textPrimary} />}
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
                  color={watched ? colors.gold : colors.icon}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
