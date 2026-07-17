import type { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';

import type { MediaCardItem } from '../components/home/MovieCard';
import i18n from '../lib/i18n';
import {
  addListItem,
  castPollVote as castPollVoteRequest,
  createSharedList,
  deleteSharedList,
  fetchActivePoll,
  fetchListById,
  fetchListItems,
  fetchListMembers,
  fetchListWatchSummary,
  fetchMyLists,
  fetchPendingInvites,
  inviteMemberByEmail,
  joinListByCode as joinListByCodeRequest,
  ListMember,
  ListPoll,
  PendingInvite,
  regenerateJoinCode as regenerateJoinCodeRequest,
  removeListItem,
  removeMember as removeMemberRequest,
  renameSharedList,
  respondToInvite as respondToInviteRequest,
  sendInviteEmail,
  SharedListItem,
  sharedListItemFromRow,
  SharedListsError,
  SharedListSummary,
  startPoll as startPollRequest,
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
  // Bumped by respondToInvite so an in-flight fetchPendingInvites (e.g.
  // triggered by AppState resume / auth token refresh -- see app/_layout.tsx
  // and auth.store.ts) can detect it's now stale and discard its response
  // instead of clobbering the more-authoritative local mutation.
  _invitesGeneration: number;

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

  // Most recent poll for the open list (active or just-closed), or null if
  // one was never started. Refreshed on open/resume and on any realtime
  // change to the poll tables (see onPollChange below) -- low-frequency
  // enough that a full refetch is simpler than fine-grained patching.
  activePoll: ListPoll | null;
  startPoll: (listId: string, deadlineIso: string, itemIds: string[]) => Promise<void>;
  castPollVote: (candidateId: string) => Promise<void>;

  // Keyed the same way as `items` (keyOf(mediaType, id)). Read-only, no
  // realtime -- watch_log isn't in the realtime publication, and watching
  // something happens outside this screen anyway; refreshed on open/resume.
  watchSummary: Record<string, number>;

  _listItemsByRowId: Record<string, string>;

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
  _invitesGeneration: 0,
  fetchPendingInvites: async () => {
    const myGeneration = get()._invitesGeneration;
    set({ isInvitesLoading: true, invitesError: null });
    try {
      const invites = await fetchPendingInvites();
      // A respondToInvite mutation landed while this fetch was in flight;
      // its local state is authoritative, so this now-stale response is
      // discarded rather than resurrecting an invite that was just handled.
      if (get()._invitesGeneration !== myGeneration) return;
      set({
        pendingInvites: Object.fromEntries(invites.map((invite) => [invite.membershipId, invite])),
        isInvitesLoading: false,
      });
    } catch (err) {
      if (get()._invitesGeneration !== myGeneration) return;
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
    const previous = get().pendingInvites[membershipId];
    set((state) => {
      const pendingInvites = { ...state.pendingInvites };
      delete pendingInvites[membershipId];
      return { pendingInvites, _invitesGeneration: state._invitesGeneration + 1 };
    });
    try {
      await respondToInviteRequest(membershipId, accept);
      if (accept) await get().fetchMyLists();
    } catch (err) {
      set((state) => ({
        pendingInvites: previous
          ? { ...state.pendingInvites, [membershipId]: previous }
          : state.pendingInvites,
        _invitesGeneration: state._invitesGeneration + 1,
      }));
      useToastStore.getState().show(i18n.t('toasts.genericError'), 'error-outline');
      throw err;
    }
  },

  activeListId: null,
  activeList: null,
  members: {},
  items: {},
  isDetailLoading: false,
  detailError: null,
  activePoll: null,
  watchSummary: {},
  _listItemsByRowId: {},

  openList: async (listId) => {
    get()._unsubscribeRealtime();
    set({
      activeListId: listId,
      activeList: null,
      members: {},
      items: {},
      activePoll: null,
      watchSummary: {},
      _listItemsByRowId: {},
      isDetailLoading: true,
      detailError: null,
    });
    try {
      const [list, members, items, activePoll, watchSummary] = await Promise.all([
        fetchListById(listId),
        fetchListMembers(listId),
        fetchListItems(listId),
        fetchActivePoll(listId),
        fetchListWatchSummary(listId),
      ]);
      set({
        activeList: list,
        members: Object.fromEntries(members.map((m) => [m.membershipId, m])),
        items: Object.fromEntries(items.map((item) => [keyOf(item.mediaType, item.id), item])),
        _listItemsByRowId: Object.fromEntries(
          items.map((item) => [item.rowId, keyOf(item.mediaType, item.id)]),
        ),
        activePoll,
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
      activePoll: null,
      watchSummary: {},
      _listItemsByRowId: {},
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
      const [list, members, items, activePoll, watchSummary] = await Promise.all([
        fetchListById(listId),
        fetchListMembers(listId),
        fetchListItems(listId),
        fetchActivePoll(listId),
        fetchListWatchSummary(listId),
      ]);
      set({
        activeList: list,
        members: Object.fromEntries(members.map((m) => [m.membershipId, m])),
        items: Object.fromEntries(items.map((item) => [keyOf(item.mediaType, item.id), item])),
        _listItemsByRowId: Object.fromEntries(
          items.map((item) => [item.rowId, keyOf(item.mediaType, item.id)]),
        ),
        activePoll,
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
          addedByAvatarVariant: 'beam',
          addedByAvatarSeed: null,
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

  startPoll: async (listId, deadlineIso, itemIds) => {
    await startPollRequest(listId, deadlineIso, itemIds);
    const poll = await fetchActivePoll(listId);
    if (get().activeListId === listId) set({ activePoll: poll });
  },

  castPollVote: async (candidateId) => {
    const poll = get().activePoll;
    if (!poll) return;
    const previous = poll;
    set({
      activePoll: {
        ...poll,
        candidates: poll.candidates.map((c) => {
          if (c.id === candidateId) return { ...c, myVote: true, voteCount: c.voteCount + 1 };
          if (c.myVote) return { ...c, myVote: false, voteCount: c.voteCount - 1 };
          return c;
        }),
      },
    });
    try {
      await castPollVoteRequest(poll.id, candidateId);
    } catch (err) {
      set({ activePoll: previous });
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
        if (adder) {
          item.addedByName = adder.displayName || adder.email;
          item.addedByAvatarVariant = adder.avatarVariant;
          item.addedByAvatarSeed = adder.avatarSeed;
        }
        const key = keyOf(item.mediaType, item.id);
        set((state) => ({
          items: { ...state.items, [key]: item },
          _listItemsByRowId: { ...state._listItemsByRowId, [item.rowId]: key },
        }));
      },
      onPollChange: async () => {
        // Poll activity is low-frequency (a handful of votes over a short
        // window), so a full refetch is simpler and plenty fast -- same
        // best-effort pattern as onMembersChange/onListChange below.
        const listId = get().activeListId;
        if (!listId) return;
        try {
          const poll = await fetchActivePoll(listId);
          set({ activePoll: poll });
        } catch {
          // Best-effort refresh; a transient failure just leaves the poll
          // card showing whatever it had before.
        }
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
      activePoll: null,
      watchSummary: {},
      detailError: null,
    });
  },
}));
