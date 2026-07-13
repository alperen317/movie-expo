import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { MediaCardItem } from '../home/MovieCard';
import { useListsStore } from '../../stores/lists.store';
import { useWatchLogStore } from '../../stores/watchLog.store';
import { AnimatedPressable } from '../ui/AnimatedPressable';

interface WatchLogSheetProps {
  visible: boolean;
  item: MediaCardItem;
  onClose: () => void;
}

type DateChoice = 'today' | 'yesterday' | 'custom';

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function WatchLogSheet({ visible, item, onClose }: WatchLogSheetProps) {
  const logWatch = useWatchLogStore((state) => state.logWatch);
  const isInWatchlist = useListsStore((state) => state.isInWatchlist(item.mediaType, item.id));

  const [dateChoice, setDateChoice] = useState<DateChoice>('today');
  const [customDate, setCustomDate] = useState(toDateInput(new Date()));
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [dropFromWatchlist, setDropFromWatchlist] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await logWatch(item, {
        watchedAt: resolvedDate,
        rating,
        note: note.trim().length > 0 ? note.trim() : null,
        dropFromWatchlist: dropFromWatchlist && isInWatchlist,
      });
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
            Mark &quot;{item.title}&quot; as watched
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setRating(rating === value ? null : value)}
                    className={`h-9 w-9 items-center justify-center rounded-full border ${
                      rating === value
                        ? 'border-primary-container bg-primary-container'
                        : 'border-glass-border bg-surface/50'
                    }`}
                  >
                    <Text
                      className={`font-sans-bold text-caption ${
                        rating === value ? 'text-on-primary-container' : 'text-text-secondary'
                      }`}
                    >
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
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
              className="rounded-lg border border-glass-border bg-surface/50 px-4 py-3 font-sans text-text-primary"
            />
          </View>

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
                  Mark as Watched
                </Text>
              )}
            </AnimatedPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
