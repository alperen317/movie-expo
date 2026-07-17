import type { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';

import type { MediaCardItem } from '../components/home/MovieCard';
import i18n from '../lib/i18n';
import {
  addListItem,
  castVote,
  createSharedList,
  deleteSharedList,
  fetchListById,
  fetchListItems,
  fetchListItemVotes,
  fetchListMembers,
  fetchListWatchSummary,
  fetchMyLists,
  fetchPendingInvites,
  inviteMemberByEmail,
  joinListByCode as joinListByCodeRequest,
  ListMember,
  PendingInvite,
  regenerateJoinCode as regenerateJoinCodeRequest,
  removeListItem,
  removeMember as removeMemberRequest,
  removeVote,
  renameSharedList,
  respondToInvite as respondToInviteRequest,
  sendInviteEmail,
  SharedListItem,
  sharedListItemFromRow,
  SharedListsError,
  SharedListSummary,
  subscribeToList,
  unsubscribeFromList,
} from '../lib/supabase/sharedLists';
import { useToastStore } from './toast.store';

function keyOf(mediaType: 'movie' | 'tv', id: number): string {
  return `${mediaType}-${id}`;
}

interface SharedListsState {
  myLists: Record<string, SharedListSummary>;
  isMyListsLoading: boolean;
  myListsError: string | null;
  fetchMyLists: () => Promise<void>;

  pendingInvites: Record<string, PendingInvite>;
  isInvitesLoading: boolean;
  invitesError: string | null;
  fetchPendingInvites: () => Promise<void>;

  createList: (name: string) => Promise<SharedListSummary>;
  renameList: (listId: string, name: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  respondToInvite: (membershipId: string, accept: boolean) => Promise<void>;
  joinListByCode: (code: string) => Promise<SharedListSummary>;
  regenerateJoinCode: (listId: string) => Promise<void>;

  activeListId: string | null;
  activeList: SharedListSummary | null;
  members: Record<string, ListMember>;
  items: Record<string, SharedListItem>;
  isDetailLoading: boolean;
  detailError: string | null;

  openList: (listId: string) => Promise<void>;
  closeList: () => void;
  refreshActiveList: () => Promise<void>;

  inviteMember: (listId: string, email: string) => Promise<void>;
  removeMember: (membershipId: string) => Promise<void>;
  leaveList: (membershipId: string) => Promise<void>;

  addItem: (listId: string, item: MediaCardItem) => Promise<void>;
  removeItem: (listId: string, mediaId: number, mediaType: 'movie' | 'tv') => Promise<void>;

  // Keyed by SharedListItem.rowId. The store doesn't know the current
  // user's id (deliberately -- no cross-store import, see addedByName's
  // resolution in _subscribeRealtime below); callers pass it into
  // toggleVote and derive "did I vote" themselves from this raw list.
  voteUserIds: Record<string, string[]>;
  toggleVote: (listItemRowId: string, currentUserId: string) => Promise<void>;

  // Keyed the same way as `items` (keyOf(mediaType, id)). Read-only, no
  // realtime -- watch_log isn't in the realtime publication, and watching
  // something happens outside this screen anyway; refreshed on open/resume.
  watchSummary: Record<string, number>;

  _listItemsByRowId: Record<string, string>;
  // Resolves realtime DELETE events on list_item_votes, whose payload.old
  // carries only the vote row's own id -- same problem/solution as
  // _listItemsByRowId above.
  _voteRowsById: Record<string, { itemRowId: string; userId: string }>;

  _channel: RealtimeChannel | null;
  _subscribeRealtime: (listId: string) => void;
  _unsubscribeRealtime: () => void;

  reset: () => void;
}

export const useSharedListsStore = create<SharedListsState>((set, get) => ({
  myLists: {},
  isMyListsLoading: false,
  myListsError: null,
  fetchMyLists: async () => {
    set({ isMyListsLoading: true, myListsError: null });
    try {
      const lists = await fetchMyLists();
      set({
        myLists: Object.fromEntries(lists.map((list) => [list.id, list])),
        isMyListsLoading: false,
      });
    } catch (err) {
      set({
        myListsError: err instanceof Error ? err.message : 'Failed to load lists.',
        isMyListsLoading: false,
      });
    }
  },

  pendingInvites: {},
  isInvitesLoading: false,
  invitesError: null,
  fetchPendingInvites: async () => {
    set({ isInvitesLoading: true, invitesError: null });
    try {
      const invites = await fetchPendingInvites();
      set({
        pendingInvites: Object.fromEntries(invites.map((invite) => [invite.membershipId, invite])),
        isInvitesLoading: false,
      });
    } catch (err) {
      set({
        invitesError: err instanceof Error ? err.message : 'Failed to load invites.',
        isInvitesLoading: false,
      });
    }
  },

  // Not optimistic: the new list's id is server-generated and doesn't
  // exist until the RPC returns, so there's no stable key to render
  // against beforehand.
  createList: async (name) => {
    const list = await createSharedList(name);
    set((state) => ({ myLists: { ...state.myLists, [list.id]: list } }));
    return list;
  },

  renameList: async (listId, name) => {
    await renameSharedList(listId, name);
    set((state) => ({
      myLists: state.myLists[listId]
        ? { ...state.myLists, [listId]: { ...state.myLists[listId], name } }
        : state.myLists,
      activeList:
        state.activeListId === listId && state.activeList
          ? { ...state.activeList, name }
          : state.activeList,
    }));
  },

  deleteList: async (listId) => {
    await deleteSharedList(listId);
    set((state) => {
      const myLists = { ...state.myLists };
      delete myLists[listId];
      return { myLists };
    });
  },

  joinListByCode: async (code) => {
    try {
      const list = await joinListByCodeRequest(code);
      set((state) => ({ myLists: { ...state.myLists, [list.id]: list } }));
      return list;
    } catch (err) {
      const message =
        err instanceof SharedListsError ? err.message : 'Something went wrong. Please try again.';
      useToastStore.getState().show(message, 'error-outline');
      throw err;
    }
  },

  regenerateJoinCode: async (listId) => {
    const joinCode = await regenerateJoinCodeRequest(listId);
    set((state) => ({
      myLists: state.myLists[listId]
        ? { ...state.myLists, [listId]: { ...state.myLists[listId], joinCode } }
        : state.myLists,
      activeList:
        state.activeListId === listId && state.activeList
          ? { ...state.activeList, joinCode }
          : state.activeList,
    }));
  },

  respondToInvite: async (membershipId, accept) => {
    await respondToInviteRequest(membershipId, accept);
    set((state) => {
      const pendingInvites = { ...state.pendingInvites };
      delete pendingInvites[membershipId];
      return { pendingInvites };
    });
    if (accept) await get().fetchMyLists();
  },

  activeListId: null,
  activeList: null,
  members: {},
  items: {},
  isDetailLoading: false,
  detailError: null,
  voteUserIds: {},
  watchSummary: {},
  _listItemsByRowId: {},
  _voteRowsById: {},

  openList: async (listId) => {
    get()._unsubscribeRealtime();
    set({
      activeListId: listId,
      activeList: null,
      members: {},
      items: {},
      voteUserIds: {},
      watchSummary: {},
      _listItemsByRowId: {},
      _voteRowsById: {},
      isDetailLoading: true,
      detailError: null,
    });
    try {
      const [list, members, items, votes, watchSummary] = await Promise.all([
        fetchListById(listId),
        fetchListMembers(listId),
        fetchListItems(listId),
        fetchListItemVotes(listId),
        fetchListWatchSummary(listId),
      ]);
      const voteUserIds: Record<string, string[]> = {};
      for (const vote of votes) {
        (voteUserIds[vote.listItemId] ??= []).push(vote.userId);
      }
      set({
        activeList: list,
        members: Object.fromEntries(members.map((m) => [m.membershipId, m])),
        items: Object.fromEntries(items.map((item) => [keyOf(item.mediaType, item.id), item])),
        _listItemsByRowId: Object.fromEntries(
          items.map((item) => [item.rowId, keyOf(item.mediaType, item.id)]),
        ),
        voteUserIds,
        _voteRowsById: Object.fromEntries(
          votes.map((vote) => [vote.id, { itemRowId: vote.listItemId, userId: vote.userId }]),
        ),
        watchSummary,
        isDetailLoading: false,
      });
      get()._subscribeRealtime(listId);
    } catch (err) {
      set({
        detailError: err instanceof Error ? err.message : 'Failed to load list.',
        isDetailLoading: false,
      });
    }
  },

  closeList: () => {
    get()._unsubscribeRealtime();
    set({
      activeListId: null,
      activeList: null,
      members: {},
      items: {},
      voteUserIds: {},
      watchSummary: {},
      _listItemsByRowId: {},
      _voteRowsById: {},
      detailError: null,
    });
  },

  // Called when the app returns to the foreground with a list screen open --
  // mobile WebSockets drop easily in the background, so the realtime channel
  // may be dead by the time the user comes back. Re-fetches without touching
  // isDetailLoading/detailError (unlike openList) so the screen doesn't flash
  // a spinner, then rebuilds the channel in case it went stale.
  refreshActiveList: async () => {
    const listId = get().activeListId;
    if (!listId) return;
    try {
      const [list, members, items, votes, watchSummary] = await Promise.all([
        fetchListById(listId),
        fetchListMembers(listId),
        fetchListItems(listId),
        fetchListItemVotes(listId),
        fetchListWatchSummary(listId),
      ]);
      const voteUserIds: Record<string, string[]> = {};
      for (const vote of votes) {
        (voteUserIds[vote.listItemId] ??= []).push(vote.userId);
      }
      set({
        activeList: list,
        members: Object.fromEntries(members.map((m) => [m.membershipId, m])),
        items: Object.fromEntries(items.map((item) => [keyOf(item.mediaType, item.id), item])),
        _listItemsByRowId: Object.fromEntries(
          items.map((item) => [item.rowId, keyOf(item.mediaType, item.id)]),
        ),
        voteUserIds,
        _voteRowsById: Object.fromEntries(
          votes.map((vote) => [vote.id, { itemRowId: vote.listItemId, userId: vote.userId }]),
        ),
        watchSummary,
      });
      get()._unsubscribeRealtime();
      get()._subscribeRealtime(listId);
    } catch {
      // Best-effort refresh; a transient failure just leaves the screen
      // showing whatever it had before, same as onMembersChange/onListChange.
    }
  },

  inviteMember: async (listId, email) => {
    try {
      const member = await inviteMemberByEmail(listId, email);
      set((state) =>
        state.activeListId === listId
          ? { members: { ...state.members, [member.membershipId]: member } }
          : {},
      );
      useToastStore.getState().show(i18n.t('toasts.inviteSent', { email }), 'person-add');
      sendInviteEmail(member.membershipId).catch(() => {
        // Best-effort: the invite already succeeded, so a notification-email
        // failure shouldn't surface to the inviter.
      });
    } catch (err) {
      const message =
        err instanceof SharedListsError ? err.message : 'Something went wrong. Please try again.';
      useToastStore.getState().show(message, 'error-outline');
      throw err;
    }
  },

  removeMember: async (membershipId) => {
    await removeMemberRequest(membershipId);
    set((state) => {
      const members = { ...state.members };
      delete members[membershipId];
      return { members };
    });
  },

  leaveList: async (membershipId) => {
    await removeMemberRequest(membershipId);
    const listId = get().activeListId;
    set((state) => {
      const myLists = { ...state.myLists };
      if (listId) delete myLists[listId];
      return { myLists };
    });
    get().closeList();
  },

  addItem: async (listId, item) => {
    const key = keyOf(item.mediaType, item.id);
    const wasAdded = Boolean(get().items[key]);
    if (wasAdded) return;

    set((state) => ({
      items: {
        ...state.items,
        [key]: {
          ...item,
          listId,
          addedBy: '',
          addedByName: '',
          addedAt: new Date().toISOString(),
          rowId: '',
        },
      },
    }));
    useToastStore
      .getState()
      .show(i18n.t('toasts.addedToSharedList', { title: item.title }), 'playlist-add-check');

    try {
      await addListItem(listId, item);
    } catch (err) {
      set((state) => {
        const items = { ...state.items };
        delete items[key];
        return { items };
      });
      useToastStore.getState().show(i18n.t('toasts.genericError'), 'error-outline');
      throw err;
    }
  },

  removeItem: async (listId, mediaId, mediaType) => {
    const key = keyOf(mediaType, mediaId);
    const previous = get().items[key];
    if (!previous) return;

    set((state) => {
      const items = { ...state.items };
      delete items[key];
      return { items };
    });
    useToastStore
      .getState()
      .show(i18n.t('toasts.removedFromSharedList', { title: previous.title }), 'playlist-remove');

    try {
      await removeListItem(listId, mediaId, mediaType);
    } catch (err) {
      set((state) => ({ items: { ...state.items, [key]: previous } }));
      useToastStore.getState().show(i18n.t('toasts.genericError'), 'error-outline');
      throw err;
    }
  },

  toggleVote: async (listItemRowId, currentUserId) => {
    const already = (get().voteUserIds[listItemRowId] ?? []).includes(currentUserId);
    set((state) => {
      const current = state.voteUserIds[listItemRowId] ?? [];
      const next = already
        ? current.filter((id) => id !== currentUserId)
        : [...current, currentUserId];
      return { voteUserIds: { ...state.voteUserIds, [listItemRowId]: next } };
    });
    try {
      if (already) {
        await removeVote(listItemRowId, currentUserId);
      } else {
        await castVote(listItemRowId);
      }
    } catch (err) {
      set((state) => {
        const current = state.voteUserIds[listItemRowId] ?? [];
        const next = already
          ? [...current, currentUserId]
          : current.filter((id) => id !== currentUserId);
        return { voteUserIds: { ...state.voteUserIds, [listItemRowId]: next } };
      });
      useToastStore.getState().show(i18n.t('toasts.genericError'), 'error-outline');
      throw err;
    }
  },

  _channel: null,
  _subscribeRealtime: (listId) => {
    const channel = subscribeToList(listId, {
      onItemsChange: (payload) => {
        // Subscribed to the whole table (no server-side filter), so ignore
        // events that belong to a different list. On DELETE the old row only
        // carries the primary key, so match via the rowId->key map instead of
        // media_id/media_type (which may be absent from the WAL).
        if (payload.eventType === 'DELETE') {
          const oldRowId = (payload.old as { id?: string }).id;
          if (!oldRowId) return;
          const key = get()._listItemsByRowId[oldRowId];
          if (!key) return;
          set((state) => {
            const items = { ...state.items };
            const byRowId = { ...state._listItemsByRowId };
            delete items[key];
            delete byRowId[oldRowId];
            return { items, _listItemsByRowId: byRowId };
          });
          return;
        }

        const row = payload.new as unknown as Parameters<typeof sharedListItemFromRow>[0];
        if (row.list_id !== get().activeListId) return;

        // Realtime postgres_changes payloads carry raw columns only (no
        // PostgREST embed), so `adder` -- and thus addedByName -- is empty
        // here. Whoever added it must be an accepted member of this same
        // list (insert RLS requires is_list_member), so they're already in
        // the members map loaded by openList; resolve the name from there
        // instead of an extra round-trip.
        const item = sharedListItemFromRow(row);
        const adder = Object.values(get().members).find((m) => m.userId === item.addedBy);
        if (adder) item.addedByName = adder.displayName || adder.email;
        const key = keyOf(item.mediaType, item.id);
        set((state) => ({
          items: { ...state.items, [key]: item },
          _listItemsByRowId: { ...state._listItemsByRowId, [item.rowId]: key },
        }));
      },
      onVotesChange: (payload) => {
        if (payload.eventType === 'DELETE') {
          // payload.old carries only the vote row's own id -- same
          // REPLICA IDENTITY DEFAULT limitation as list_items' DELETE.
          const oldId = (payload.old as { id?: string }).id;
          if (!oldId) return;
          const removed = get()._voteRowsById[oldId];
          if (!removed) return;
          set((state) => {
            const voteRowsById = { ...state._voteRowsById };
            delete voteRowsById[oldId];
            return {
              voteUserIds: {
                ...state.voteUserIds,
                [removed.itemRowId]: (state.voteUserIds[removed.itemRowId] ?? []).filter(
                  (id) => id !== removed.userId,
                ),
              },
              _voteRowsById: voteRowsById,
            };
          });
          return;
        }

        const row = payload.new as { id: string; list_item_id: string; user_id: string };
        // list_item_votes has no list_id to filter on directly; reuse
        // _listItemsByRowId (already scoped to the open list) instead.
        if (!get()._listItemsByRowId[row.list_item_id]) return;

        set((state) => {
          const current = state.voteUserIds[row.list_item_id] ?? [];
          // Always (re)register the row id -> {item, user} mapping, even if
          // this user's vote is already reflected (e.g. the realtime echo
          // of our own optimistic insert) -- otherwise a later unvote's
          // DELETE event can't be resolved back to this item/user.
          const nextUserIds = current.includes(row.user_id) ? current : [...current, row.user_id];
          return {
            voteUserIds: { ...state.voteUserIds, [row.list_item_id]: nextUserIds },
            _voteRowsById: {
              ...state._voteRowsById,
              [row.id]: { itemRowId: row.list_item_id, userId: row.user_id },
            },
          };
        });
      },
      onMembersChange: async (payload) => {
        // Subscribed to the whole table; skip members of other lists.
        const row = (payload.new ?? payload.old) as { list_id?: string } | undefined;
        if (row && row.list_id && row.list_id !== get().activeListId) return;
        const listId = get().activeListId;
        if (!listId) return;
        try {
          const members = await fetchListMembers(listId);
          set({ members: Object.fromEntries(members.map((m) => [m.membershipId, m])) });
        } catch {
          // Best-effort refresh; a transient failure here just means the
          // member list is stale until the next change or manual refresh.
        }
      },
      onListChange: async () => {
        const listId = get().activeListId;
        if (!listId) return;
        try {
          const list = await fetchListById(listId);
          set({ activeList: list });
        } catch {
          // Best-effort refresh, same as onMembersChange above.
        }
      },
    });
    set({ _channel: channel });
  },
  _unsubscribeRealtime: () => {
    const channel = get()._channel;
    if (channel) unsubscribeFromList(channel);
    set({ _channel: null });
  },

  reset: () => {
    get()._unsubscribeRealtime();
    set({
      myLists: {},
      myListsError: null,
      pendingInvites: {},
      invitesError: null,
      activeListId: null,
      activeList: null,
      members: {},
      items: {},
      voteUserIds: {},
      watchSummary: {},
      detailError: null,
    });
  },
}));
