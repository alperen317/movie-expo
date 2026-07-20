import { buildDiarySections, DiaryEntryInput } from './diary';

function entry(
  id: number,
  watchedAt: string,
  mediaType: 'movie' | 'tv' = 'movie',
): DiaryEntryInput {
  return { id, mediaType, watchedAt };
}

describe('buildDiarySections', () => {
  it('returns no sections for an empty log', () => {
    expect(buildDiarySections([])).toEqual([]);
  });

  it('groups entries by month, newest first', () => {
    const sections = buildDiarySections([
      entry(1, '2026-05-10T12:00:00Z'),
      entry(2, '2026-07-01T12:00:00Z'),
      entry(3, '2026-07-15T12:00:00Z'),
    ]);
    expect(sections.map((section) => section.monthKey)).toEqual(['2026-07', '2026-05']);
    expect(sections[0].entries.map((e) => e.id)).toEqual([3, 2]);
  });

  it('flags every watch after the first as a rewatch', () => {
    const sections = buildDiarySections([
      entry(1, '2026-01-01T12:00:00Z'),
      entry(1, '2026-06-01T12:00:00Z'),
    ]);
    const flat = sections.flatMap((section) => section.entries);
    expect(flat.find((e) => e.watchedAt.startsWith('2026-06'))!.isRewatch).toBe(true);
    expect(flat.find((e) => e.watchedAt.startsWith('2026-01'))!.isRewatch).toBe(false);
  });

  it('treats same id across media types as different titles', () => {
    const sections = buildDiarySections([
      entry(1, '2026-01-01T12:00:00Z', 'movie'),
      entry(1, '2026-06-01T12:00:00Z', 'tv'),
    ]);
    const flat = sections.flatMap((section) => section.entries);
    expect(flat.every((e) => !e.isRewatch)).toBe(true);
  });
});
