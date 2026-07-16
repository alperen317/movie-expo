import type { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';

import type { MediaCardItem } from '../components/home/MovieCard';
import i18n from '../lib/i18n';
import {
  addListItem,
  createSharedList,
  deleteSharedList,
  fetchListById,
  fetchListItems,
  fetchListMembers,
  fetchMyLists,
  fetchPendingInvites,
  inviteMemberByEmail,
  joinListByCode as joinListByCodeRequest,
  ListMember,
  PendingInvite,
  regenerateJoinCode as regenerateJoinCodeRequest,
  removeListItem,
  removeMember as removeMemberRequest,
  renameSharedList,
  respondToInvite as respondToInviteRequest,
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

  inviteMember: (listId: string, email: string) => Promise<void>;
  removeMember: (membershipId: string) => Promise<void>;
  leaveList: (membershipId: string) => Promise<void>;

  addItem: (listId: string, item: MediaCardItem) => Promise<void>;
  removeItem: (listId: string, mediaId: number, mediaType: 'movie' | 'tv') => Promise<void>;

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
  _listItemsByRowId: {},

  openList: async (listId) => {
    get()._unsubscribeRealtime();
    set({
      activeListId: listId,
      activeList: null,
      members: {},
      items: {},
      _listItemsByRowId: {},
      isDetailLoading: true,
      detailError: null,
    });
    try {
      const [list, members, items] = await Promise.all([
        fetchListById(listId),
        fetchListMembers(listId),
        fetchListItems(listId),
      ]);
      set({
        activeList: list,
        members: Object.fromEntries(members.map((m) => [m.membershipId, m])),
        items: Object.fromEntries(items.map((item) => [keyOf(item.mediaType, item.id), item])),
        _listItemsByRowId: Object.fromEntries(
          items.map((item) => [item.rowId, keyOf(item.mediaType, item.id)]),
        ),
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
      _listItemsByRowId: {},
      detailError: null,
    });
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
        [key]: { ...item, listId, addedBy: '', addedAt: new Date().toISOString(), rowId: '' },
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

        const item = sharedListItemFromRow(row);
        const key = keyOf(item.mediaType, item.id);
        set((state) => ({
          items: { ...state.items, [key]: item },
          _listItemsByRowId: { ...state._listItemsByRowId, [item.rowId]: key },
        }));
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
      detailError: null,
    });
  },
}));
