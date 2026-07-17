import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

import { AnimatedPressable } from '../ui/AnimatedPressable';
import type { SharedListItem } from '../../lib/supabase/sharedLists';
import { useThemeColors } from '../../lib/theme/useThemeColors';

interface StartPollModalProps {
  visible: boolean;
  items: SharedListItem[];
  onClose: () => void;
  onSubmit: (deadlineIso: string, itemIds: string[]) => Promise<void>;
}

type Preset = '30m' | '1h' | '3h' | 'tonight' | 'tomorrow' | 'custom';

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
function toTimeInput(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function resolveDeadline(preset: Preset, customDate: string, customTime: string): Date | null {
  const now = new Date();
  if (preset === '30m') return new Date(now.getTime() + 30 * 60000);
  if (preset === '1h') return new Date(now.getTime() + 60 * 60000);
  if (preset === '3h') return new Date(now.getTime() + 3 * 60 * 60000);
  if (preset === 'tonight') {
    const tonight = new Date(now);
    tonight.setHours(21, 0, 0, 0);
    if (tonight <= now) tonight.setDate(tonight.getDate() + 1);
    return tonight;
  }
  if (preset === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(21, 0, 0, 0);
    return tomorrow;
  }
  const parsed = new Date(`${customDate}T${customTime}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function StartPollModal({ visible, items, onClose, onSubmit }: StartPollModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState<Preset>('tonight');
  const [customDate, setCustomDate] = useState(toDateInput(new Date()));
  const [customTime, setCustomTime] = useState(toTimeInput(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSelectedIds(new Set());
    setPreset('tonight');
    setCustomDate(toDateInput(new Date()));
    setCustomTime(toTimeInput(new Date()));
    setError(null);
  }, [visible]);

  const toggleItem = (rowId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (selectedIds.size < 2) {
      setError(t('components.startPoll.needTwoCandidates'));
      return;
    }
    const deadline = resolveDeadline(preset, customDate, customTime);
    if (!deadline || deadline.getTime() <= Date.now()) {
      setError(t('components.startPoll.invalidDeadline'));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(deadline.toISOString(), Array.from(selectedIds));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const presets: { key: Preset; label: string }[] = [
    { key: '30m', label: t('components.startPoll.preset30m') },
    { key: '1h', label: t('components.startPoll.preset1h') },
    { key: '3h', label: t('components.startPoll.preset3h') },
    { key: 'tonight', label: t('components.startPoll.presetTonight') },
    { key: 'tomorrow', label: t('components.startPoll.presetTomorrow') },
    { key: 'custom', label: t('components.startPoll.presetCustom') },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        className="items-center justify-center bg-background/80 px-margin-mobile"
      >
        <View className="max-h-[85%] w-full max-w-md gap-stack-md rounded-2xl border border-glass-border bg-surface-container-low p-6">
          <Text className="font-sans-bold text-title-md text-text-primary">
            {t('components.startPoll.title')}
          </Text>

          <View className="gap-stack-sm">
            <Text className="font-sans-semibold text-caption text-text-secondary">
              {t('components.startPoll.candidatesLabel')}
            </Text>
            <ScrollView style={{ maxHeight: 220 }}>
              <View className="gap-2">
                {items.map((item) => {
                  const checked = selectedIds.has(item.rowId);
                  return (
                    <Pressable
                      key={item.rowId}
                      onPress={() => toggleItem(item.rowId)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={item.title}
                      className="flex-row items-center gap-3"
                    >
                      <View
                        className={`h-5 w-5 items-center justify-center rounded border ${
                          checked
                            ? 'border-primary-container bg-primary-container'
                            : 'border-glass-border bg-surface'
                        }`}
                      >
                        {checked && <MaterialIcons name="check" size={16} color="#3f2e00" />}
                      </View>
                      <Text
                        className="flex-1 font-sans text-body-md text-text-primary"
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View className="gap-stack-sm">
            <Text className="font-sans-semibold text-caption text-text-secondary">
              {t('components.startPoll.deadlineLabel')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {presets.map((p) => (
                <Pressable
                  key={p.key}
                  onPress={() => setPreset(p.key)}
                  className={`items-center rounded-full border px-3 py-2 ${
                    preset === p.key
                      ? 'border-primary-container bg-primary-container'
                      : 'border-glass-border bg-surface/50'
                  }`}
                >
                  <Text
                    className={`font-sans-semibold text-caption ${
                      preset === p.key ? 'text-on-primary-container' : 'text-text-secondary'
                    }`}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {preset === 'custom' && (
              <View className="flex-row gap-2">
                <TextInput
                  value={customDate}
                  onChangeText={setCustomDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#A1A1AA80"
                  className="flex-1 rounded-lg border border-glass-border bg-surface/50 px-4 py-3 font-sans text-text-primary"
                />
                <TextInput
                  value={customTime}
                  onChangeText={setCustomTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#A1A1AA80"
                  className="w-24 rounded-lg border border-glass-border bg-surface/50 px-4 py-3 font-sans text-text-primary"
                />
              </View>
            )}
          </View>

          {error && <Text className="font-sans text-caption text-error">{error}</Text>}

          <View className="flex-row gap-3">
            <AnimatedPressable
              onPress={handleClose}
              className="flex-1 items-center rounded-full border border-glass-border py-3"
            >
              <Text className="font-sans-semibold text-body-md text-text-secondary">
                {t('common.cancel')}
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 items-center rounded-full bg-primary-container py-3"
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.onGold} />
              ) : (
                <Text className="font-sans-semibold text-body-md text-on-primary-container">
                  {t('components.startPoll.submit')}
                </Text>
              )}
            </AnimatedPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
