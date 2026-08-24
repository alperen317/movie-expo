import { api, ApiError } from './client';
import type { AvatarVariant } from '../avatar/generate';
import type { MediaCardItem } from '../../components/home/MovieCard';

export type MemberRole = 'owner' | 'member';
export type MemberStatus = 'pending' | 'accepted' | 'declined';

export interface SharedListSummary {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Null for an invitee who hasn't accepted yet -- only members see the code. */
  joinCode: string | null;
}

export interface SharedListItem extends MediaCardItem {
  listId: string;
  addedBy: string;
  /** Display name (falling back to email) of whoever added this item. */
  addedByName: string;
  addedByAvatarVariant: AvatarVariant;
  addedByAvatarSeed: string | null;
  addedAt: string;
  /** Server-side primary key (uuid) of the list item row. */
  rowId: string;
}

export interface ListMember {
  membershipId: string;
  listId: string;
  userId: string;
  email: string;
  displayName: string | null;
  avatarVariant: AvatarVariant;
  avatarSeed: string | null;
  role: MemberRole;
  status: MemberStatus;
  invitedBy: string | null;
  createdAt: string;
  respondedAt: string | null;
}

export interface PendingInvite {
  membershipId: string;
  listId: string;
  listName: string;
  invitedByEmail: string | null;
  createdAt: string;
}

export interface PollCandidate {
  id: string;
  listItemId: string;
  voteCount: number;
  myVote: boolean;
}

export interface ListPoll {
  id: string;
  deadline: string;
  createdBy: string;
  candidates: PollCandidate[];
}

export class SharedListsError extends Error {
  code:
    | 'invite_failed'
    | 'cannot_invite_self'
    | 'invalid_code'
    | 'poll_already_active'
    | 'invalid_deadline'
    | 'need_at_least_two_candidates'
    | 'invalid_candidate'
    | 'poll_closed'
    | 'creator_cannot_leave'
    | 'rate_limited'
    | 'unknown';

  constructor(code: SharedListsError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

const MESSAGES: Record<SharedListsError['code'], string> = {
  invite_failed: "Couldn't send that invite — double-check the email.",
  cannot_invite_self: "You can't invite yourself.",
  invalid_code: 'That code doesn’t match any list.',
  poll_already_active: 'This list already has an active poll.',
  invalid_deadline: 'Pick a deadline in the future.',
  need_at_least_two_candidates: 'Pick at least two titles to vote on.',
  invalid_candidate: 'That title is no longer on this list.',
  poll_closed: 'This poll has already closed.',
  creator_cannot_leave: "The creator can't leave — delete the list instead.",
  rate_limited: 'Too many attempts. Try again in a few minutes.',
  unknown: 'Something went wrong. Please try again.',
};

// Maps a raw ApiError to a SharedListsError with a fixed, non-enumerating
// message. `allowed` is the set of domain codes this particular call can
// legitimately fail with (from the endpoint's own documented 409/404 bodies);
// anything else -- including a 429, which carries no code at all -- becomes
// 'rate_limited' or 'unknown' rather than being misreported as a code this
// call never actually produces.
function domainError(err: unknown, allowed: readonly SharedListsError['code'][]): never {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      throw new SharedListsError('rate_limited', MESSAGES.rate_limited);
    }
    if (err.code && (allowed as string[]).includes(err.code)) {
      const code = err.code as SharedListsError['code'];
      throw new SharedListsError(code, MESSAGES[code]);
    }
  }
  throw new SharedListsError('unknown', err instanceof Error ? err.message : MESSAGES.unknown);
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export function fetchMyLists(): Promise<SharedListSummary[]> {
  return api.get('/lists');
}

export function fetchPendingInvites(): Promise<PendingInvite[]> {
  return api.get('/lists/invites');
}

export function fetchListById(listId: string): Promise<SharedListSummary> {
  return api.get(`/lists/${listId}`);
}

export function createSharedList(name: string): Promise<SharedListSummary> {
  return api.post('/lists', { name });
}

export async function renameSharedList(listId: string, name: string): Promise<void> {
  await api.put(`/lists/${listId}`, { name });
}

export function deleteSharedList(listId: string): Promise<void> {
  return api.delete(`/lists/${listId}`);
}

// Joins instantly (accepted, no pending step) -- possessing the code is the
// authorization, unlike inviteMemberByEmail which requires the invitee to
// accept.
export async function joinListByCode(code: string): Promise<SharedListSummary> {
  try {
    return await api.post('/lists/join', { code: code.trim() });
  } catch (err) {
    domainError(err, ['invalid_code']);
  }
}

export async function regenerateJoinCode(listId: string): Promise<string> {
  const response = await api.post<{ joinCode: string }>(`/lists/${listId}/join-code`);
  return response.joinCode;
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export function fetchListMembers(listId: string): Promise<ListMember[]> {
  return api.get(`/lists/${listId}/members`);
}

export async function inviteMemberByEmail(listId: string, email: string): Promise<ListMember> {
  try {
    return await api.post(`/lists/${listId}/invites`, { email: email.trim() });
  } catch (err) {
    domainError(err, ['invite_failed', 'cannot_invite_self']);
  }
}

export async function respondToInvite(membershipId: string, accept: boolean): Promise<void> {
  await api.post(`/invites/${membershipId}/response`, { accept });
}

// Serves both "creator removes someone else" and "member leaves on their
// own" -- the same call either way; the server decides what's allowed.
export async function removeMember(membershipId: string): Promise<void> {
  try {
    await api.delete(`/members/${membershipId}`);
  } catch (err) {
    domainError(err, ['creator_cannot_leave']);
  }
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

function titleRequest(item: MediaCardItem) {
  return {
    id: item.id,
    mediaType: item.mediaType,
    title: item.title,
    posterPath: item.posterPath,
    voteAverage: item.voteAverage,
    year: item.year,
    genres: item.genres,
  };
}

export function fetchListItems(listId: string): Promise<SharedListItem[]> {
  return api.get(`/lists/${listId}/items`);
}

export function addListItem(listId: string, item: MediaCardItem): Promise<SharedListItem> {
  return api.post(`/lists/${listId}/items`, titleRequest(item));
}

export function removeListItem(
  listId: string,
  mediaId: number,
  mediaType: 'movie' | 'tv',
): Promise<void> {
  return api.delete(`/lists/${listId}/items/${mediaType}/${mediaId}`);
}

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------

// Returns the most recent poll for the list (active or just-closed), or
// null if one has never been started. Callers derive "active" themselves by
// comparing `deadline` to the current time.
export async function fetchActivePoll(listId: string): Promise<ListPoll | null> {
  return (await api.get<ListPoll | undefined>(`/lists/${listId}/poll`)) ?? null;
}

export async function startPoll(
  listId: string,
  deadlineIso: string,
  itemIds: string[],
): Promise<string> {
  try {
    const response = await api.post<{ pollId: string }>(`/lists/${listId}/polls`, {
      deadline: deadlineIso,
      itemIds,
    });
    return response.pollId;
  } catch (err) {
    domainError(err, [
      'poll_already_active',
      'invalid_deadline',
      'need_at_least_two_candidates',
      'invalid_candidate',
    ]);
  }
}

export async function castPollVote(pollId: string, candidateId: string): Promise<void> {
  try {
    await api.post(`/polls/${pollId}/votes`, { candidateId });
  } catch (err) {
    domainError(err, ['poll_closed', 'invalid_candidate']);
  }
}

interface WatchSummaryDto {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  watchedCount: number;
}

// Keyed the same way as the store's `keyOf` helper. Titles nobody has
// watched are simply absent from the response -- callers should treat a
// missing key as 0.
export async function fetchListWatchSummary(listId: string): Promise<Record<string, number>> {
  const rows = await api.get<WatchSummaryDto[]>(`/lists/${listId}/watch-summary`);
  const summary: Record<string, number> = {};
  for (const row of rows) {
    summary[`${row.mediaType}-${row.mediaId}`] = row.watchedCount;
  }
  return summary;
}
