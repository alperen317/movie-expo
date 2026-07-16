import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { toSearchCardItem, type MediaCardItem } from '../../components/home/MovieCard';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { parseLetterboxdExport } from '../../lib/importers/letterboxd';
import { matchImportRecords, type MatchResult } from '../../lib/importers/match';
import { parseTVTimeExport } from '../../lib/importers/tvtime';
import { useThemeColors } from '../../lib/theme/useThemeColors';
import { readZipEntries } from '../../lib/importers/zip';
import { addSavedMediaBatch } from '../../lib/supabase/lists';
import { addWatchLogEntriesBatch } from '../../lib/supabase/watchLog';
import { getPosterUrl } from '../../lib/tmdb/config';
import { searchMulti } from '../../lib/tmdb/search';
import { useListsStore } from '../../stores/lists.store';
import { useWatchLogStore } from '../../stores/watchLog.store';

type Source = 'tvtime' | 'letterboxd';
type Step = 'source' | 'matching' | 'review' | 'importing' | 'done';

const SOURCE_FILES: Record<Source, string[]> = {
  tvtime: ['tracking-prod-records.csv', 'tracking-prod-records-v2.csv'],
  letterboxd: ['diary.csv', 'watched.csv', 'ratings.csv', 'watchlist.csv'],
};

// DocumentPicker's `base64` option only populates asset.base64 on web; on
// native we get a file:// uri and read it via expo-file-system instead.
async function readPickedZipAsBase64(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === 'web' && asset.base64) {
    const commaIndex = asset.base64.indexOf(',');
    return commaIndex === -1 ? asset.base64 : asset.base64.slice(commaIndex + 1);
  }
  return new File(asset.uri).base64();
}

function ManualSearchBox({
  initialQuery,
  onPick,
}: {
  initialQuery: string;
  onPick: (item: MediaCardItem) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [candidates, setCandidates] = useState<MediaCardItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const runSearch = async () => {
    if (query.trim().length === 0) return;
    setIsSearching(true);
    try {
      const response = await searchMulti(query.trim());
      const items = response.results
        .map(toSearchCardItem)
        .filter((item): item is MediaCardItem => item !== null)
        .slice(0, 5);
      setCandidates(items);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <View className="gap-2 rounded-xl border border-glass-border bg-surface/50 p-3">
      <View className="flex-row gap-2">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('import.searchPlaceholder')}
          placeholderTextColor="#A1A1AA80"
          onSubmitEditing={runSearch}
          className="flex-1 rounded-lg border border-glass-border bg-surface px-3 py-2 font-sans text-text-primary"
        />
        <AnimatedPressable
          onPress={runSearch}
          className="items-center justify-center rounded-lg bg-primary-container px-4"
        >
          {isSearching ? (
            <ActivityIndicator color="#3f2e00" />
          ) : (
            <Text className="font-sans-semibold text-caption text-on-primary-container">
              {t('import.search')}
            </Text>
          )}
        </AnimatedPressable>
      </View>
      {candidates.map((item) => {
        const posterUrl = getPosterUrl(item.posterPath, 'w185');
        return (
          <AnimatedPressable
            key={`${item.mediaType}-${item.id}`}
            onPress={() => onPick(item)}
            className="flex-row items-center gap-3 rounded-lg bg-surface p-2"
          >
            <View style={{ width: 36, aspectRatio: 2 / 3 }} className="overflow-hidden rounded">
              <Image
                source={posterUrl ? { uri: posterUrl } : undefined}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </View>
            <Text className="flex-1 font-sans text-body-md text-text-primary" numberOfLines={1}>
              {item.title} {item.year ? `(${item.year})` : ''}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

function ReviewRow({
  result,
  isSelected,
  isSearching,
  onToggle,
  onStartSearch,
  onPick,
}: {
  result: MatchResult;
  isSelected: boolean;
  isSearching: boolean;
  onToggle: () => void;
  onStartSearch: () => void;
  onPick: (item: MediaCardItem) => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { record, candidate, confidence } = result;
  const posterUrl = candidate ? getPosterUrl(candidate.posterPath, 'w185') : null;

  return (
    <View className="gap-2 rounded-xl border border-glass-border bg-surface-container-low p-3">
      <AnimatedPressable
        onPress={candidate ? onToggle : onStartSearch}
        className="flex-row items-center gap-3"
      >
        <View
          className={`h-5 w-5 items-center justify-center rounded border ${
            isSelected
              ? 'border-primary-container bg-primary-container'
              : 'border-glass-border bg-surface'
          }`}
        >
          {isSelected && <MaterialIcons name="check" size={16} color="#3f2e00" />}
        </View>
        {candidate && (
          <View style={{ width: 40, aspectRatio: 2 / 3 }} className="overflow-hidden rounded">
            <Image
              source={posterUrl ? { uri: posterUrl } : undefined}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </View>
        )}
        <View className="flex-1">
          <Text className="font-sans-semibold text-body-md text-text-primary" numberOfLines={1}>
            {candidate?.title ?? record.title}
          </Text>
          <Text className="font-sans text-caption text-text-secondary">
            {(candidate?.year ?? record.year) || '—'} ·{' '}
            {record.listType === 'watched' ? t('import.listWatched') : t('import.listWatchlist')}
            {candidate?.mediaType === 'tv' ? t('import.showSuffix') : ''}
          </Text>
        </View>
        {!candidate && <MaterialIcons name="search" size={20} color={colors.icon} />}
      </AnimatedPressable>
      {isSearching && <ManualSearchBox initialQuery={record.title} onPick={onPick} />}
      {candidate && confidence === 'low' && !isSearching && (
        <AnimatedPressable onPress={onStartSearch} className="self-start">
          <Text className="font-sans text-caption text-primary-container">
            {t('import.pickDifferent')}
          </Text>
        </AnimatedPressable>
      )}
    </View>
  );
}

export default function ImportScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [step, setStep] = useState<Step>('source');
  const [error, setError] = useState<string | null>(null);
  const [matchProgress, setMatchProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<MatchResult[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [summary, setSummary] = useState<{ imported: number; skipped: number } | null>(null);
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);

  const pickSource = async (source: Source) => {
    setError(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/x-zip-compressed'],
        copyToCacheDirectory: true,
        base64: true,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];

      const base64 = await readPickedZipAsBase64(asset);
      const files = await readZipEntries(base64, SOURCE_FILES[source]);
      const records = source === 'tvtime' ? parseTVTimeExport(files) : parseLetterboxdExport(files);

      if (records.length === 0) {
        setError(t('import.noData'));
        return;
      }

      setStep('matching');
      setMatchProgress({ done: 0, total: records.length });
      const matched = await matchImportRecords(records, (done, total) =>
        setMatchProgress({ done, total }),
      );
      setResults(matched);
      setSelected(
        new Set(matched.map((_, i) => i).filter((i) => matched[i].confidence === 'high')),
      );
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('import.readError'));
      setStep('source');
    }
  };

  const toggleSelected = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const applyManualMatch = (index: number, candidate: MediaCardItem) => {
    setResults((prev) =>
      prev.map((result, i) =>
        i === index ? { ...result, candidate, confidence: 'high' } : result,
      ),
    );
    setSelected((prev) => new Set(prev).add(index));
    setSearchingIndex(null);
  };

  const commitImport = async () => {
    setStep('importing');
    setError(null);
    try {
      const chosen = Array.from(selected)
        .map((i) => results[i])
        .filter((r): r is MatchResult & { candidate: MediaCardItem } => r.candidate !== null);

      const watched = chosen.filter((r) => r.record.listType === 'watched');
      const watchlist = chosen.filter((r) => r.record.listType === 'watchlist');

      if (watched.length > 0) {
        await addWatchLogEntriesBatch(
          watched.map((r) => ({
            item: r.candidate,
            watchedAt: r.record.watchedAt ?? new Date(),
            rating: r.record.rating,
          })),
        );
      }
      if (watchlist.length > 0) {
        await addSavedMediaBatch(
          watchlist.map((r) => r.candidate),
          'watchlist',
        );
      }

      await Promise.all([
        useWatchLogStore.getState().fetchWatchLog(),
        useListsStore.getState().fetchWatchlist(),
      ]);

      setSummary({ imported: chosen.length, skipped: results.length - chosen.length });
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('import.importError'));
      setStep('review');
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
          <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text className="text-headline-lg-mobile font-sans-bold text-text-primary">
          {t('import.title')}
        </Text>
      </View>

      {error && (
        <View className="mx-margin-mobile mb-stack-sm rounded-lg bg-error/10 px-4 py-3">
          <Text className="font-sans text-caption text-error">{error}</Text>
        </View>
      )}

      {step === 'source' && (
        <View className="flex-1 gap-stack-md px-margin-mobile pt-stack-lg">
          <Text className="font-sans text-body-md text-text-secondary">{t('import.intro')}</Text>
          <AnimatedPressable
            onPress={() => pickSource('tvtime')}
            className="flex-row items-center gap-3 rounded-xl border border-glass-border bg-surface-container-low p-4"
          >
            <MaterialIcons name="tv" size={22} color={colors.icon} />
            <View className="flex-1">
              <Text className="font-sans-semibold text-body-md text-text-primary">TV Time</Text>
              <Text className="font-sans text-caption text-text-secondary">
                {t('import.gdprExport')}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => pickSource('letterboxd')}
            className="flex-row items-center gap-3 rounded-xl border border-glass-border bg-surface-container-low p-4"
          >
            <MaterialIcons name="movie" size={22} color={colors.icon} />
            <View className="flex-1">
              <Text className="font-sans-semibold text-body-md text-text-primary">Letterboxd</Text>
              <Text className="font-sans text-caption text-text-secondary">
                {t('import.export')}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.icon} />
          </AnimatedPressable>
        </View>
      )}

      {step === 'matching' && (
        <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
          <ActivityIndicator color={colors.textPrimary} />
          <Text className="font-sans text-body-md text-text-secondary">
            {t('import.matching', { done: matchProgress.done, total: matchProgress.total })}
          </Text>
        </View>
      )}

      {step === 'review' && (
        <>
          <View className="px-margin-mobile pb-stack-sm">
            <Text className="font-sans text-caption text-text-secondary">
              {t('import.selectedCount', { selected: selected.size, total: results.length })}
            </Text>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {results.map((result, index) => (
              <ReviewRow
                key={index}
                result={result}
                isSelected={selected.has(index)}
                isSearching={searchingIndex === index}
                onToggle={() => toggleSelected(index)}
                onStartSearch={() => setSearchingIndex(searchingIndex === index ? null : index)}
                onPick={(item) => applyManualMatch(index, item)}
              />
            ))}
          </ScrollView>
          <View className="absolute bottom-0 left-0 right-0 border-t border-glass-border bg-background px-margin-mobile py-stack-md">
            <AnimatedPressable
              onPress={commitImport}
              disabled={selected.size === 0}
              className="items-center rounded-full bg-primary-container py-3"
            >
              <Text className="font-sans-semibold text-body-md text-on-primary-container">
                {t('import.importButton', { count: selected.size })}
              </Text>
            </AnimatedPressable>
          </View>
        </>
      )}

      {step === 'importing' && (
        <View className="flex-1 items-center justify-center gap-stack-sm px-margin-mobile">
          <ActivityIndicator color={colors.textPrimary} />
          <Text className="font-sans text-body-md text-text-secondary">
            {t('import.importing')}
          </Text>
        </View>
      )}

      {step === 'done' && summary && (
        <View className="flex-1 items-center justify-center gap-stack-md px-margin-mobile">
          <MaterialIcons name="check-circle" size={48} color={colors.gold} />
          <Text className="text-center font-sans-semibold text-title-md text-text-primary">
            {t('import.importedCount', { count: summary.imported })}
          </Text>
          {summary.skipped > 0 && (
            <Text className="text-center font-sans text-body-md text-text-secondary">
              {t('import.skippedCount', { count: summary.skipped })}
            </Text>
          )}
          <AnimatedPressable
            onPress={() => router.back()}
            className="items-center rounded-full bg-primary-container px-6 py-3"
          >
            <Text className="font-sans-semibold text-body-md text-on-primary-container">
              {t('import.done')}
            </Text>
          </AnimatedPressable>
        </View>
      )}
    </SafeAreaView>
  );
}
