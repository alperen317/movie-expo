import { create } from 'zustand';

import type { MediaCardItem } from '../components/home/MovieCard';
import i18n from '../lib/i18n';
import { subscribeToList, unsubscribeFromList, type ListSubscription } from '../lib/api/realtime';
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
  SharedListItem,
  SharedListsError,
  SharedListSummary,
  startPoll as startPollRequest,
} from '../lib/api/sharedLists';
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
  // update to it -- low-frequency enough that a full refetch is simpler
  // than fine-grained patching.
  activePoll: ListPoll | null;
  startPoll: (listId: string, deadlineIso: string, itemIds: string[]) => Promise<void>;
  castPollVote: (candidateId: string) => Promise<void>;

  // Keyed the same way as `items` (keyOf(mediaType, id)). Read-only, no
  // realtime -- watch history isn't part of ListHub's events and watching
  // something happens outside this screen anyway; refreshed on open/resume.
  watchSummary: Record<string, number>;

  _subscription: ListSubscription | null;
  _subscribeRealtime: (listId: string) => Promise<void>;
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
  // exist until the request returns, so there's no stable key to render
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

  openList: async (listId) => {
    get()._unsubscribeRealtime();
    set({
      activeListId: listId,
      activeList: null,
      members: {},
      items: {},
      activePoll: null,
      watchSummary: {},
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
        activePoll,
        watchSummary,
        isDetailLoading: false,
      });
      await get()._subscribeRealtime(listId);
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
      detailError: null,
    });
  },

  // Called when the app returns to the foreground with a list screen open --
  // the realtime connection drops easily while backgrounded, so it may be
  // stale by the time the user comes back. Re-fetches without touching
  // isDetailLoading/detailError (unlike openList) so the screen doesn't flash
  // a spinner, then rebuilds the subscription in case it went stale.
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
        activePoll,
        watchSummary,
      });
      get()._unsubscribeRealtime();
      await get()._subscribeRealtime(listId);
    } catch {
      // Best-effort refresh; a transient failure just leaves the screen
      // showing whatever it had before, same as onMembersChanged/onListRenamed.
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
      // Unlike the optimistic placeholder, the server's response already has
      // the real rowId and the adder's name/avatar filled in -- replace with
      // it directly rather than waiting on the realtime echo to backfill them.
      const saved = await addListItem(listId, item);
      set((state) => ({ items: { ...state.items, [key]: saved } }));
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

  _subscription: null,
  _subscribeRealtime: async (listId) => {
    try {
      const subscription = await subscribeToList(listId, {
        onItemAdded: (item) => {
          // Group membership already scopes events to this list server-side;
          // this is a narrow defense against a stale listener from a
          // just-closed subscription still being attached for a moment.
          if (item.listId !== get().activeListId) return;
          set((state) => ({ items: { ...state.items, [keyOf(item.mediaType, item.id)]: item } }));
        },
        onItemRemoved: ({ mediaId, mediaType }) => {
          const key = keyOf(mediaType, mediaId);
          set((state) => {
            if (!(key in state.items)) return state;
            const items = { ...state.items };
            delete items[key];
            return { items };
          });
        },
        onMembersChanged: async () => {
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
        onListRenamed: ({ name }) => {
          set((state) => ({
            activeList: state.activeList ? { ...state.activeList, name } : state.activeList,
            myLists:
              state.activeListId && state.myLists[state.activeListId]
                ? {
                    ...state.myLists,
                    [state.activeListId]: { ...state.myLists[state.activeListId], name },
                  }
                : state.myLists,
          }));
        },
        onListDeleted: () => {
          const listId = get().activeListId;
          if (!listId) return;
          set((state) => {
            const myLists = { ...state.myLists };
            delete myLists[listId];
            return { myLists, detailError: i18n.t('listDetail.deletedError') };
          });
          useToastStore.getState().show(i18n.t('listDetail.deletedError'), 'delete-outline');
        },
        onPollUpdated: async () => {
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
      });

      // A fast close/reopen could have moved on to a different list (or none)
      // by the time the connection/JoinList round trip finishes.
      if (get().activeListId === listId) {
        set({ _subscription: subscription });
      } else {
        unsubscribeFromList(subscription).catch(() => {});
      }
    } catch {
      // Best-effort -- the screen still works without live updates; opening
      // it again (or the AppState resume path) will retry.
    }
  },
  _unsubscribeRealtime: () => {
    const subscription = get()._subscription;
    if (!subscription) return;
    set({ _subscription: null });
    unsubscribeFromList(subscription).catch(() => {});
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
