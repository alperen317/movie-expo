import type { MediaCardItem } from '../../components/home/MovieCard';

export interface ListWatchData {
  items: MediaCardItem[];
  /** `${mediaType}-${mediaId}` -> distinct accepted members who logged it. */
  watchSummary: Record<string, number>;
}

export interface FriendsWatchedItem extends MediaCardItem {
  friendCount: number;
}

// Builds the "your list friends watched" row from the per-list watch
// summaries. The RPC's count includes the caller when they logged the title
// themselves, but those titles are excluded here anyway (the row should never
// suggest something the user has already seen), so every surviving count is a
// pure friend count. Titles appearing on several shared lists are deduped,
// keeping the highest count.
export function aggregateFriendsWatched(
  lists: ListWatchData[],
  watchedByMe: ReadonlySet<string>,
  limit = 20,
): FriendsWatchedItem[] {
  const best = new Map<string, FriendsWatchedItem>();

  for (const list of lists) {
    for (const item of list.items) {
      const key = `${item.mediaType}-${item.id}`;
      if (watchedByMe.has(key)) continue;
      const friendCount = list.watchSummary[key] ?? 0;
      if (friendCount <= 0) continue;

      const existing = best.get(key);
      if (!existing || friendCount > existing.friendCount) {
        best.set(key, {
          id: item.id,
          title: item.title,
          year: item.year,
          posterPath: item.posterPath,
          voteAverage: item.voteAverage,
          genres: item.genres,
          mediaType: item.mediaType,
          friendCount,
        });
      }
    }
  }

  return [...best.values()]
    .sort((a, b) => b.friendCount - a.friendCount || b.voteAverage - a.voteAverage)
    .slice(0, limit);
}
