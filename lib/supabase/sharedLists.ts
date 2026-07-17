import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import type { MediaCardItem } from '../../components/home/MovieCard';
import type { AvatarVariant } from '../avatar/generate';
import { supabase } from './client';

export type MemberRole = 'owner' | 'member';
export type MemberStatus = 'pending' | 'accepted' | 'declined';

export interface SharedListSummary {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  joinCode: string;
}

export interface SharedListItem extends MediaCardItem {
  listId: string;
  addedBy: string;
  /** Display name (falling back to email) of whoever added this item. */
  addedByName: string;
  addedByAvatarVariant: AvatarVariant;
  addedByAvatarSeed: string | null;
  addedAt: string;
  /** Server-side primary key (uuid) of the list_items row. */
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

export class SharedListsError extends Error {
  code:
    | 'user_not_found'
    | 'cannot_invite_self'
    | 'already_invited_or_member'
    | 'invalid_code'
    | 'not_owner'
    | 'rate_limited'
    | 'poll_already_active'
    | 'invalid_deadline'
    | 'need_at_least_two_candidates'
    | 'poll_closed'
    | 'unknown';

  constructor(code: SharedListsError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

function fromInviteRpcError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('user_not_found')) {
    throw new SharedListsError('user_not_found', 'No account found with that email.');
  }
  if (message.includes('cannot_invite_self')) {
    throw new SharedListsError('cannot_invite_self', "You can't invite yourself.");
  }
  if (message.includes('already_invited_or_member')) {
    throw new SharedListsError(
      'already_invited_or_member',
      'This person is already invited or a member.',
    );
  }
  if (message.includes('rate_limited')) {
    throw new SharedListsError(
      'rate_limited',
      'Too many invites sent. Try again in a few minutes.',
    );
  }
  throw new SharedListsError('unknown', message);
}

function fromJoinCodeRpcError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('invalid_code')) {
    throw new SharedListsError('invalid_code', 'That code doesn’t match any list.');
  }
  if (message.includes('not_owner')) {
    throw new SharedListsError('not_owner', 'Only the list owner can do that.');
  }
  if (message.includes('rate_limited')) {
    throw new SharedListsError('rate_limited', 'Too many attempts. Try again in a few minutes.');
  }
  throw new SharedListsError('unknown', message);
}

function fromPollRpcError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('poll_already_active')) {
    throw new SharedListsError('poll_already_active', 'This list already has an active poll.');
  }
  if (message.includes('invalid_deadline')) {
    throw new SharedListsError('invalid_deadline', 'Pick a deadline in the future.');
  }
  if (message.includes('need_at_least_two_candidates')) {
    throw new SharedListsError(
      'need_at_least_two_candidates',
      'Pick at least two titles to vote on.',
    );
  }
  if (message.includes('poll_closed')) {
    throw new SharedListsError('poll_closed', 'This poll has already closed.');
  }
  throw new SharedListsError('unknown', message);
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

interface ListRow {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  join_code: string;
}

function fromListRow(row: ListRow): SharedListSummary {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    joinCode: row.join_code,
  };
}

// Queried via list_members (not `lists` directly): `lists` SELECT RLS
// deliberately includes rows the caller has only been *invited* to
// (status='pending'), so a direct `lists` query would blend "my lists"
// together with "lists I've been invited to but not joined."
export async function fetchMyLists(): Promise<SharedListSummary[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Same over-broad-RLS concern as fetchPendingInvites: without the
  // explicit user_id filter, this would also return co-members' accepted
  // rows for any shared list (harmless here since results are deduped by
  // list.id downstream, but wasteful and fragile to rely on that).
  const { data, error } = await supabase
    .from('list_members')
    .select('list:lists(id, name, created_by, created_at, updated_at, join_code)')
    .eq('status', 'accepted')
    .eq('user_id', user.id)
    .order('created_at', { referencedTable: 'lists', ascending: false });

  if (error) throw error;
  return (data ?? [])
    .map((row) => row.list as unknown as ListRow | null)
    .filter((list): list is ListRow => list !== null)
    .map(fromListRow);
}

export async function fetchPendingInvites(): Promise<PendingInvite[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // list_members' SELECT RLS is deliberately broader than "my own row"
  // (accepted members can see the whole roster, incl. co-members' pending
  // invites, so the Members modal in lists/[id].tsx can show "who's
  // pending"). Without this explicit filter, this query -- which is
  // specifically "invites waiting for ME to respond to" -- would also
  // return OTHER people's still-pending invites for any list the caller
  // already belongs to.
  const { data, error } = await supabase
    .from('list_members')
    .select(
      'id, list_id, created_at, list:lists(name), inviter:profiles!list_members_invited_by_fkey(email)',
    )
    .eq('status', 'pending')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => {
    const list = row.list as unknown as { name: string } | null;
    const inviter = row.inviter as unknown as { email: string } | null;
    return {
      membershipId: row.id,
      listId: row.list_id,
      listName: list?.name ?? 'Untitled list',
      invitedByEmail: inviter?.email ?? null,
      createdAt: row.created_at,
    };
  });
}

export async function fetchListById(listId: string): Promise<SharedListSummary> {
  const { data, error } = await supabase
    .from('lists')
    .select('id, name, created_by, created_at, updated_at, join_code')
    .eq('id', listId)
    .single();

  if (error) throw error;
  return fromListRow(data);
}

export async function createSharedList(name: string): Promise<SharedListSummary> {
  const { data, error } = await supabase.rpc('create_shared_list', { p_name: name });
  if (error) throw error;
  return fromListRow(data as ListRow);
}

export async function renameSharedList(listId: string, name: string): Promise<void> {
  const { error } = await supabase.from('lists').update({ name }).eq('id', listId);
  if (error) throw error;
}

export async function deleteSharedList(listId: string): Promise<void> {
  const { error } = await supabase.from('lists').delete().eq('id', listId);
  if (error) throw error;
}

// Joins instantly (accepted, no pending step) -- possessing the code is the
// authorization, unlike inviteMemberByEmail which requires the invitee to
// accept. See join_list_by_code in 0009_list_join_code.sql.
export async function joinListByCode(code: string): Promise<SharedListSummary> {
  const { data, error } = await supabase.rpc('join_list_by_code', { p_code: code.trim() });
  if (error) fromJoinCodeRpcError(error);
  return fromListRow(data as ListRow);
}

export async function regenerateJoinCode(listId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_list_join_code', { p_list_id: listId });
  if (error) fromJoinCodeRpcError(error);
  return data as string;
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

interface MemberRow {
  id: string;
  list_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  invited_by: string | null;
  created_at: string;
  responded_at: string | null;
  member: {
    email: string;
    display_name: string | null;
    avatar_variant: string;
    avatar_seed: string | null;
  } | null;
}

function fromMemberRow(row: MemberRow): ListMember {
  return {
    membershipId: row.id,
    listId: row.list_id,
    userId: row.user_id,
    email: row.member?.email ?? '',
    displayName: row.member?.display_name ?? null,
    avatarVariant: (row.member?.avatar_variant as AvatarVariant) ?? 'beam',
    avatarSeed: row.member?.avatar_seed ?? null,
    role: row.role,
    status: row.status,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

export async function fetchListMembers(listId: string): Promise<ListMember[]> {
  const { data, error } = await supabase
    .from('list_members')
    .select(
      'id, list_id, user_id, role, status, invited_by, created_at, responded_at, member:profiles!list_members_user_id_fkey(email, display_name, avatar_variant, avatar_seed)',
    )
    .eq('list_id', listId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => fromMemberRow(row as unknown as MemberRow));
}

export async function inviteMemberByEmail(listId: string, email: string): Promise<ListMember> {
  const { data, error } = await supabase.rpc('invite_to_list', {
    p_list_id: listId,
    p_email: email.trim(),
  });
  if (error) fromInviteRpcError(error);
  return fromMemberRow({ ...(data as MemberRow), member: null });
}

// Fire-and-forget: the invite itself already succeeded via the RPC above by
// the time this is called, so a failure here (network blip, Brevo outage)
// shouldn't surface to the user -- see sharedLists.store.ts's inviteMember.
export async function sendInviteEmail(membershipId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-list-invite-email', {
    body: { membershipId },
  });
  if (error) throw error;
}

export async function respondToInvite(membershipId: string, accept: boolean): Promise<void> {
  const { error } = await supabase
    .from('list_members')
    .update({ status: accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
    .eq('id', membershipId);
  if (error) throw error;
}

// Serves both "creator removes someone else" and "member leaves on their
// own" -- it's the same delete call either way; RLS decides what's allowed.
export async function removeMember(membershipId: string): Promise<void> {
  const { error } = await supabase.from('list_members').delete().eq('id', membershipId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

interface ItemRow {
  id: string;
  list_id: string;
  media_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  vote_average: number;
  year: string | null;
  genres: string[] | null;
  added_by: string;
  created_at: string;
  // Only present on the initial REST fetch (a PostgREST embed) -- realtime
  // postgres_changes payloads carry the raw row only, so this is absent
  // there and the store backfills the adder's name/avatar from its members
  // map instead.
  adder?: {
    display_name: string | null;
    email: string;
    avatar_variant: string;
    avatar_seed: string | null;
  } | null;
}

function fromItemRow(row: ItemRow): SharedListItem {
  return {
    id: row.media_id,
    mediaType: row.media_type,
    title: row.title,
    posterPath: row.poster_path,
    voteAverage: row.vote_average,
    year: row.year,
    genres: row.genres ?? [],
    listId: row.list_id,
    addedBy: row.added_by,
    addedByName: row.adder?.display_name || row.adder?.email || '',
    addedByAvatarVariant: (row.adder?.avatar_variant as AvatarVariant) ?? 'beam',
    addedByAvatarSeed: row.adder?.avatar_seed ?? null,
    addedAt: row.created_at,
    rowId: row.id,
  };
}

export async function fetchListItems(listId: string): Promise<SharedListItem[]> {
  const { data, error } = await supabase
    .from('list_items')
    .select(
      'id, list_id, media_id, media_type, title, poster_path, vote_average, year, genres, added_by, created_at, adder:profiles!list_items_added_by_fkey(display_name, email, avatar_variant, avatar_seed)',
    )
    .eq('list_id', listId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => fromItemRow(row as unknown as ItemRow));
}

export async function addListItem(listId: string, item: MediaCardItem): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  const { data, error } = await supabase
    .from('list_items')
    .insert({
      list_id: listId,
      media_id: item.id,
      media_type: item.mediaType,
      title: item.title,
      poster_path: item.posterPath,
      vote_average: item.voteAverage,
      year: item.year,
      genres: item.genres,
      added_by: user.id,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function removeListItem(
  listId: string,
  mediaId: number,
  mediaType: 'movie' | 'tv',
): Promise<void> {
  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', listId)
    .eq('media_id', mediaId)
    .eq('media_type', mediaType);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------

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

interface PollRow {
  poll_id: string;
  deadline: string;
  created_by: string;
  candidate_id: string;
  list_item_id: string;
  vote_count: number;
  my_vote: boolean;
}

// Returns the most recent poll for the list (active or just-closed), or
// null if one has never been started. Callers derive "active" themselves
// by comparing `deadline` to the current time.
export async function fetchActivePoll(listId: string): Promise<ListPoll | null> {
  const { data, error } = await supabase.rpc('get_list_poll', { p_list_id: listId });
  if (error) throw error;

  const rows = (data ?? []) as PollRow[];
  if (rows.length === 0) return null;

  return {
    id: rows[0].poll_id,
    deadline: rows[0].deadline,
    createdBy: rows[0].created_by,
    candidates: rows.map((row) => ({
      id: row.candidate_id,
      listItemId: row.list_item_id,
      voteCount: row.vote_count,
      myVote: row.my_vote,
    })),
  };
}

export async function startPoll(
  listId: string,
  deadlineIso: string,
  itemIds: string[],
): Promise<string> {
  const { data, error } = await supabase.rpc('start_list_poll', {
    p_list_id: listId,
    p_deadline: deadlineIso,
    p_item_ids: itemIds,
  });
  if (error) fromPollRpcError(error);
  return data as string;
}

export async function castPollVote(pollId: string, candidateId: string): Promise<void> {
  const { error } = await supabase.rpc('cast_poll_vote', {
    p_poll_id: pollId,
    p_candidate_id: candidateId,
  });
  if (error) fromPollRpcError(error);
}

interface WatchSummaryRow {
  media_id: number;
  media_type: 'movie' | 'tv';
  watched_count: number;
}

// Keyed the same way as the store's `keyOf` helper (list_items' unique
// (list_id, media_id, media_type) constraint makes this unambiguous within
// a single list). Items nobody has watched are simply absent from the RPC
// result -- callers should treat a missing key as 0.
export async function fetchListWatchSummary(listId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('get_list_watch_summary', { p_list_id: listId });
  if (error) throw error;

  const summary: Record<string, number> = {};
  for (const row of (data ?? []) as WatchSummaryRow[]) {
    summary[`${row.media_type}-${row.media_id}`] = row.watched_count;
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

type ChangePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

export function subscribeToList(
  listId: string,
  handlers: {
    onItemsChange?: (payload: ChangePayload) => void;
    onMembersChange?: (payload: ChangePayload) => void;
    onListChange?: (payload: ChangePayload) => void;
    onPollChange?: (payload: ChangePayload) => void;
  },
): RealtimeChannel {
  // NOTE: list_items / list_members are subscribed WITHOUT a row-level
  // `filter`. A filtered subscription relies on the WAL record carrying the
  // filtered column, but Postgres tables default to REPLICA IDENTITY DEFAULT,
  // which writes ONLY the primary key on DELETE. That means DELETE events
  // can't be filtered server-side (the filter column is absent) and the old
  // row doesn't carry the columns the client needs -- so removals are never
  // delivered. Subscribing to the whole table and filtering client-side makes
  // add AND remove work regardless of the table's replica identity. (See
  // migration 0005 for the complementary REPLICA IDENTITY FULL change, which
  // is now optional defense-in-depth.) The `lists` table keeps its UPDATE
  // filter because UPDATE events carry the full new row, so the filter works.
  return supabase
    .channel(`list:${listId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' }, (payload) =>
      handlers.onItemsChange?.(payload),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'list_members' }, (payload) =>
      handlers.onMembersChange?.(payload),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'list_polls' }, (payload) =>
      handlers.onPollChange?.(payload),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'list_poll_candidates' },
      (payload) => handlers.onPollChange?.(payload),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'list_poll_votes' }, (payload) =>
      handlers.onPollChange?.(payload),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'lists', filter: `id=eq.${listId}` },
      (payload) => handlers.onListChange?.(payload),
    )
    .subscribe();
}

export function unsubscribeFromList(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}

export { fromItemRow as sharedListItemFromRow };
