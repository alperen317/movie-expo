import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { MediaCardItem } from '../home/MovieCard';
import type { MediaSeasonSummary } from '../../lib/tmdb/details';
import { getSeasonDetails } from '../../lib/tmdb/tv';
import { useEpisodeProgressStore } from '../../stores/episodeProgress.store';
import { useListsStore } from '../../stores/lists.store';
import { useWatchLogStore } from '../../stores/watchLog.store';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface WatchLogSheetProps {
  visible: boolean;
  item: MediaCardItem;
  onClose: () => void;
  // TV-only: lets the sheet offer "mark every episode too" alongside the log entry.
  seasons?: MediaSeasonSummary[];
}

type DateChoice = 'today' | 'yesterday' | 'custom';

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function WatchLogSheet({ visible, item, onClose, seasons }: WatchLogSheetProps) {
  const logWatch = useWatchLogStore((state) => state.logWatch);
  const updateWatch = useWatchLogStore((state) => state.updateWatch);
  const existingEntry = useWatchLogStore((state) => state.latestEntryFor(item.mediaType, item.id));
  const markSeason = useEpisodeProgressStore((state) => state.markSeason);
  const isInWatchlist = useListsStore((state) => state.isInWatchlist(item.mediaType, item.id));
  const hasSeasons = item.mediaType === 'tv' && (seasons?.length ?? 0) > 0;

  const [dateChoice, setDateChoice] = useState<DateChoice>('today');
  const [customDate, setCustomDate] = useState(toDateInput(new Date()));
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [dropFromWatchlist, setDropFromWatchlist] = useState(true);
  const [markAllEpisodes, setMarkAllEpisodes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-opening the sheet for an already-logged title previously always
  // showed a blank form (no fetch of the existing row), which read as if
  // the earlier submission had been lost. Prefill from the latest entry
  // so the sheet reflects what's actually saved, and edit that row in
  // place on submit instead of silently inserting a rewatch duplicate.
  useEffect(() => {
    if (!visible) return;
    if (existingEntry) {
      const entryDate = new Date(existingEntry.watchedAt);
      const entryDateStr = toDateInput(entryDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (entryDateStr === toDateInput(new Date())) setDateChoice('today');
      else if (entryDateStr === toDateInput(yesterday)) setDateChoice('yesterday');
      else {
        setDateChoice('custom');
        setCustomDate(entryDateStr);
      }

      setRating(existingEntry.rating);
      setNote(existingEntry.note ?? '');
      setMarkAllEpisodes(false);
    } else {
      setDateChoice('today');
      setCustomDate(toDateInput(new Date()));
      setRating(null);
      setNote('');
      setMarkAllEpisodes(true);
    }
    setDropFromWatchlist(true);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Stars are a 5-point UI over the same 1-10 rating scale the DB stores
  // (each star = 2 points), so no schema change is needed for this.
  const starCount = rating === null ? 0 : Math.round(rating / 2);

  const resolvedDate = useMemo(() => {
    if (dateChoice === 'today') return new Date();
    if (dateChoice === 'yesterday') {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return date;
    }
    const parsed = new Date(`${customDate}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [dateChoice, customDate]);

  const reset = () => {
    setDateChoice('today');
    setCustomDate(toDateInput(new Date()));
    setRating(null);
    setNote('');
    setDropFromWatchlist(true);
    setMarkAllEpisodes(true);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!resolvedDate) {
      setError('Enter a valid date (YYYY-MM-DD).');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const options = {
        watchedAt: resolvedDate,
        rating,
        note: note.trim().length > 0 ? note.trim() : null,
        dropFromWatchlist: dropFromWatchlist && isInWatchlist,
      };
      if (existingEntry) {
        await updateWatch(existingEntry.logId, options);
      } else {
        await logWatch(item, options);
      }

      if (hasSeasons && markAllEpisodes && seasons) {
        for (const season of seasons) {
          const details = await getSeasonDetails(item.id, season.seasonNumber);
          await markSeason(
            item.id,
            season.seasonNumber,
            details.episodes.map((episode) => episode.episode_number),
          );
        }
      }

      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        className="items-center justify-center bg-background/80 px-margin-mobile"
      >
        <View className="w-full max-w-md gap-stack-md rounded-2xl border border-glass-border bg-surface-container-low p-6">
          <Text className="font-sans-bold text-title-md text-text-primary" numberOfLines={1}>
            {existingEntry
              ? `Edit your log for "${item.title}"`
              : `Mark "${item.title}" as watched`}
          </Text>

          <View className="gap-stack-sm">
            <Text className="font-sans-semibold text-caption text-text-secondary">When?</Text>
            <View className="flex-row gap-2">
              {(['today', 'yesterday', 'custom'] as DateChoice[]).map((choice) => (
                <Pressable
                  key={choice}
                  onPress={() => setDateChoice(choice)}
                  className={`flex-1 items-center rounded-full border py-2 ${
                    dateChoice === choice
                      ? 'border-primary-container bg-primary-container'
                      : 'border-glass-border bg-surface/50'
                  }`}
                >
                  <Text
                    className={`font-sans-semibold text-caption ${
                      dateChoice === choice ? 'text-on-primary-container' : 'text-text-secondary'
                    }`}
                  >
                    {choice === 'today' ? 'Today' : choice === 'yesterday' ? 'Yesterday' : 'Custom'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {dateChoice === 'custom' && (
              <TextInput
                value={customDate}
                onChangeText={setCustomDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#A1A1AA80"
                className="rounded-lg border border-glass-border bg-surface/50 px-4 py-3 font-sans text-text-primary"
              />
            )}
          </View>

          <View className="gap-stack-sm">
            <Text className="font-sans-semibold text-caption text-text-secondary">
              Rating (optional)
            </Text>
            <View className="flex-row gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star === starCount ? null : star * 2)}
                  hitSlop={6}
                >
                  <MaterialIcons
                    name={star <= starCount ? 'star' : 'star-border'}
                    size={32}
                    color={star <= starCount ? '#f5c451' : '#A1A1AA'}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          <View className="gap-stack-sm">
            <Text className="font-sans-semibold text-caption text-text-secondary">
              Note (optional)
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Any thoughts?"
              placeholderTextColor="#A1A1AA80"
              multiline
              textAlignVertical="top"
              className="min-h-[100px] rounded-lg border border-glass-border bg-surface/50 px-4 py-3 font-sans text-text-primary"
            />
          </View>

          {hasSeasons && (
            <View className="gap-1">
              <Pressable
                onPress={() => setMarkAllEpisodes((value) => !value)}
                className="flex-row items-center gap-2"
              >
                <View
                  className={`h-5 w-5 items-center justify-center rounded border ${
                    markAllEpisodes
                      ? 'border-primary-container bg-primary-container'
                      : 'border-glass-border bg-surface'
                  }`}
                >
                  {markAllEpisodes && <MaterialIcons name="check" size={16} color="#3f2e00" />}
                </View>
                <Text className="font-sans text-caption text-text-secondary">
                  Mark every episode as watched too
                </Text>
              </Pressable>
              <Text className="font-sans text-[11px] text-text-secondary">
                Only watched some seasons? Uncheck this and use the Seasons list below instead.
              </Text>
            </View>
          )}

          {isInWatchlist && (
            <Pressable
              onPress={() => setDropFromWatchlist((value) => !value)}
              className="flex-row items-center gap-2"
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded border ${
                  dropFromWatchlist
                    ? 'border-primary-container bg-primary-container'
                    : 'border-glass-border bg-surface'
                }`}
              >
                {dropFromWatchlist && <MaterialIcons name="check" size={16} color="#3f2e00" />}
              </View>
              <Text className="font-sans text-caption text-text-secondary">
                Remove from Watchlist
              </Text>
            </Pressable>
          )}

          {error && <Text className="font-sans text-caption text-error">{error}</Text>}

          <View className="flex-row gap-3">
            <AnimatedPressable
              onPress={handleClose}
              className="flex-1 items-center rounded-full border border-glass-border py-3"
            >
              <Text className="font-sans-semibold text-body-md text-text-secondary">Cancel</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 items-center rounded-full bg-primary-container py-3"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#3f2e00" />
              ) : (
                <Text className="font-sans-semibold text-body-md text-on-primary-container">
                  {existingEntry ? 'Save Changes' : 'Mark as Watched'}
                </Text>
              )}
            </AnimatedPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
