export interface DiaryEntryInput {
  id: number;
  mediaType: 'movie' | 'tv';
  watchedAt: string;
}

export type DiaryEntry<T> = T & { isRewatch: boolean };

export interface DiarySection<T> {
  /** `YYYY-MM`, ready for locale-aware month formatting by the screen. */
  monthKey: string;
  entries: DiaryEntry<T>[];
}

// Turns raw watch-log entries into a newest-first diary: grouped by calendar
// month, with every watch of a title after its chronologically first one
// flagged as a rewatch.
export function buildDiarySections<T extends DiaryEntryInput>(entries: T[]): DiarySection<T>[] {
  const firstWatchAt = new Map<string, string>();
  for (const entry of entries) {
    const key = `${entry.mediaType}-${entry.id}`;
    const current = firstWatchAt.get(key);
    if (!current || entry.watchedAt < current) firstWatchAt.set(key, entry.watchedAt);
  }

  const sorted = [...entries].sort((a, b) => b.watchedAt.localeCompare(a.watchedAt));

  const sections: DiarySection<T>[] = [];
  for (const entry of sorted) {
    const monthKey = entry.watchedAt.slice(0, 7);
    const isRewatch = firstWatchAt.get(`${entry.mediaType}-${entry.id}`) !== entry.watchedAt;
    const last = sections[sections.length - 1];
    const decorated = { ...entry, isRewatch };
    if (last && last.monthKey === monthKey) {
      last.entries.push(decorated);
    } else {
      sections.push({ monthKey, entries: [decorated] });
    }
  }
  return sections;
}
