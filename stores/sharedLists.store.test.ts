import {
  addListItem,
  castPollVote as castPollVoteRequest,
  joinListByCode as joinListByCodeRequest,
  removeListItem,
  respondToInvite as respondToInviteRequest,
  SharedListsError,
} from '../lib/api/sharedLists';
import { subscribeToList, unsubscribeFromList } from '../lib/api/realtime';
import { useSharedListsStore } from './sharedLists.store';
import { useToastStore } from './toast.store';

import type { MediaCardItem } from '../components/home/MovieCard';
import type { ListPoll, PendingInvite, SharedListItem, SharedListSummary } from '../lib/api/sharedLists';
import type { ListRealtimeHandlers } from '../lib/api/realtime';

jest.mock('../lib/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

// lib/api/sharedLists imports lib/api/config, which throws at import time
// without EXPO_PUBLIC_API_BASE_URL -- mock the whole module boundary.
// SharedListsError is redefined locally (not pulled from the real module) so
// `instanceof` checks inside the store still resolve against *this* mock's
// class reference, which is all the store code needs.
jest.mock('../lib/api/sharedLists', () => {
  class SharedListsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    SharedListsError,
    fetchMyLists: jest.fn(),
    fetchPendingInvites: jest.fn(),
    fetchListById: jest.fn(),
    createSharedList: jest.fn(),
    renameSharedList: jest.fn(),
    deleteSharedList: jest.fn(),
    joinListByCode: jest.fn(),
    regenerateJoinCode: jest.fn(),
    fetchListMembers: jest.fn(),
    inviteMemberByEmail: jest.fn(),
    respondToInvite: jest.fn(),
    removeMember: jest.fn(),
    fetchListItems: jest.fn(),
    addListItem: jest.fn(),
    removeListItem: jest.fn(),
    fetchActivePoll: jest.fn(),
    startPoll: jest.fn(),
    castPollVote: jest.fn(),
    fetchListWatchSummary: jest.fn(),
  };
});

// The realtime transport is a separate module boundary from the REST calls
// above -- mocked independently so tests can drive its handlers directly
// without a real SignalR connection.
jest.mock('../lib/api/realtime', () => ({
  subscribeToList: jest.fn(),
  unsubscribeFromList: jest.fn(),
}));

const mockAddListItem = addListItem as jest.Mock;
const mockRemoveListItem = removeListItem as jest.Mock;
const mockRespondToInviteRequest = respondToInviteRequest as jest.Mock;
const mockCastPollVoteRequest = castPollVoteRequest as jest.Mock;
const mockJoinListByCodeRequest = joinListByCodeRequest as jest.Mock;
const mockSubscribeToList = subscribeToList as jest.Mock;
const mockUnsubscribeFromList = unsubscribeFromList as jest.Mock;

const item: MediaCardItem = {
  id: 1,
  mediaType: 'movie',
  title: 'Arrival',
  posterPath: null,
  voteAverage: 8,
  year: '2016',
  genres: ['Sci-Fi'],
};

// Drives _subscribeRealtime for a list and hands back the handlers object it
// registered, so a test can invoke one directly instead of needing a real
// SignalR connection to fire it.
async function subscribeAndGetHandlers(listId: string): Promise<ListRealtimeHandlers> {
  mockSubscribeToList.mockResolvedValueOnce({ listId, hub: {}, listeners: [] });
  await useSharedListsStore.getState()._subscribeRealtime(listId);
  const lastCall = mockSubscribeToList.mock.calls.at(-1) as [string, ListRealtimeHandlers];
  return lastCall[1];
}

describe('sharedLists.store', () => {
  beforeEach(() => {
    useSharedListsStore.setState({
      myLists: {},
      pendingInvites: {},
      _invitesGeneration: 0,
      activeListId: null,
      activeList: null,
      members: {},
      items: {},
      activePoll: null,
      watchSummary: {},
      _subscription: null,
    });
    mockAddListItem.mockReset();
    mockRemoveListItem.mockReset();
    mockRespondToInviteRequest.mockReset();
    mockCastPollVoteRequest.mockReset();
    mockJoinListByCodeRequest.mockReset();
    mockSubscribeToList.mockReset();
    mockUnsubscribeFromList.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    // See episodeProgress.store.test.ts -- clears the toast auto-hide timer
    // so it doesn't keep the process alive after the suite finishes.
    useToastStore.getState().hide();
  });

  describe('addItem', () => {
    it('adds the item optimistically and replaces it with the server response on success', async () => {
      const saved: SharedListItem = {
        ...item,
        listId: 'list-1',
        addedBy: 'user-1',
        addedByName: 'Ayşe',
        addedByAvatarVariant: 'beam',
        addedByAvatarSeed: null,
        addedAt: '2026-07-01T00:00:00.000Z',
        rowId: 'row-1',
      };
      mockAddListItem.mockResolvedValue(saved);

      const pending = useSharedListsStore.getState().addItem('list-1', item);

      expect(useSharedListsStore.getState().items['movie-1']).toBeDefined();
      await pending;
      expect(useSharedListsStore.getState().items['movie-1']).toEqual(saved);
    });

    it('rolls back the optimistic add when the request fails', async () => {
      mockAddListItem.mockRejectedValue(new Error('network down'));

      await expect(useSharedListsStore.getState().addItem('list-1', item)).rejects.toThrow(
        'network down',
      );

      expect(useSharedListsStore.getState().items['movie-1']).toBeUndefined();
    });

    it('is a no-op if the item is already in the list', async () => {
      useSharedListsStore.setState({
        items: {
          'movie-1': { ...item, listId: 'list-1' } as unknown as SharedListItem,
        },
      });

      await useSharedListsStore.getState().addItem('list-1', item);

      expect(mockAddListItem).not.toHaveBeenCalled();
    });
  });

  describe('removeItem', () => {
    const existing: SharedListItem = {
      ...item,
      listId: 'list-1',
      addedBy: 'user-1',
      addedByName: 'Ayşe',
      addedByAvatarVariant: 'beam',
      addedByAvatarSeed: null,
      addedAt: '2026-07-01T00:00:00.000Z',
      rowId: 'row-1',
    };

    it('removes the item optimistically and keeps it removed on success', async () => {
      useSharedListsStore.setState({ items: { 'movie-1': existing } });
      mockRemoveListItem.mockResolvedValue(undefined);

      await useSharedListsStore.getState().removeItem('list-1', 1, 'movie');

      expect(useSharedListsStore.getState().items['movie-1']).toBeUndefined();
    });

    it('restores the item when the request fails', async () => {
      useSharedListsStore.setState({ items: { 'movie-1': existing } });
      mockRemoveListItem.mockRejectedValue(new Error('network down'));

      await expect(useSharedListsStore.getState().removeItem('list-1', 1, 'movie')).rejects.toThrow(
        'network down',
      );

      expect(useSharedListsStore.getState().items['movie-1']).toEqual(existing);
    });
  });

  describe('respondToInvite', () => {
    const invite: PendingInvite = {
      membershipId: 'inv-1',
      listId: 'list-1',
      listName: 'Movie Night',
      invitedByEmail: 'friend@example.com',
      createdAt: '2026-07-01T00:00:00.000Z',
    };

    it('removes the invite optimistically and refetches lists on acceptance', async () => {
      useSharedListsStore.setState({ pendingInvites: { 'inv-1': invite } });
      mockRespondToInviteRequest.mockResolvedValue(undefined);
      const fetchMyListsSpy = jest
        .spyOn(useSharedListsStore.getState(), 'fetchMyLists')
        .mockResolvedValue(undefined);

      await useSharedListsStore.getState().respondToInvite('inv-1', true);

      expect(useSharedListsStore.getState().pendingInvites['inv-1']).toBeUndefined();
      expect(fetchMyListsSpy).toHaveBeenCalled();
    });

    it('restores the invite when the request fails', async () => {
      useSharedListsStore.setState({ pendingInvites: { 'inv-1': invite } });
      mockRespondToInviteRequest.mockRejectedValue(new Error('network down'));

      await expect(useSharedListsStore.getState().respondToInvite('inv-1', false)).rejects.toThrow(
        'network down',
      );

      expect(useSharedListsStore.getState().pendingInvites['inv-1']).toEqual(invite);
    });
  });

  describe('castPollVote', () => {
    const poll: ListPoll = {
      id: 'poll-1',
      deadline: '2026-08-01T00:00:00.000Z',
      createdBy: 'user-1',
      candidates: [
        { id: 'cand-1', listItemId: 'item-1', voteCount: 2, myVote: false },
        { id: 'cand-2', listItemId: 'item-2', voteCount: 1, myVote: true },
      ],
    };

    it('moves the optimistic vote to the new candidate and keeps it on success', async () => {
      useSharedListsStore.setState({ activePoll: poll });
      mockCastPollVoteRequest.mockResolvedValue(undefined);

      await useSharedListsStore.getState().castPollVote('cand-1');

      const candidates = useSharedListsStore.getState().activePoll?.candidates;
      expect(candidates).toEqual([
        { id: 'cand-1', listItemId: 'item-1', voteCount: 3, myVote: true },
        { id: 'cand-2', listItemId: 'item-2', voteCount: 0, myVote: false },
      ]);
    });

    it('restores the previous poll snapshot when the request fails', async () => {
      useSharedListsStore.setState({ activePoll: poll });
      mockCastPollVoteRequest.mockRejectedValue(new Error('network down'));

      await expect(useSharedListsStore.getState().castPollVote('cand-1')).rejects.toThrow(
        'network down',
      );

      expect(useSharedListsStore.getState().activePoll).toEqual(poll);
    });
  });

  describe('joinListByCode', () => {
    it('adds the joined list on success', async () => {
      const list: SharedListSummary = {
        id: 'list-2',
        name: 'Weekend Watch',
        createdBy: 'user-2',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        joinCode: 'ABCD1234',
      };
      mockJoinListByCodeRequest.mockResolvedValue(list);

      const result = await useSharedListsStore.getState().joinListByCode('ABCD1234');

      expect(result).toEqual(list);
      expect(useSharedListsStore.getState().myLists['list-2']).toEqual(list);
    });

    // Regression check for the old invite/join-code enumeration fixes: a
    // SharedListsError's own message (the generic, non-enumerating one) must
    // reach the toast, not a different fallback string that could leak more
    // or less detail.
    it('surfaces a SharedListsError message as-is instead of a generic fallback', async () => {
      mockJoinListByCodeRequest.mockRejectedValue(
        new SharedListsError('invalid_code', 'That code doesn’t match any list.'),
      );

      await expect(useSharedListsStore.getState().joinListByCode('BADCODE1')).rejects.toThrow();
    });
  });

  describe('realtime handlers', () => {
    const remoteItem: SharedListItem = {
      ...item,
      listId: 'list-1',
      addedBy: 'user-2',
      addedByName: 'Kerem',
      addedByAvatarVariant: 'ring',
      addedByAvatarSeed: null,
      addedAt: '2026-07-01T00:00:00.000Z',
      rowId: 'row-9',
    };

    it('onItemAdded writes the full item directly into the items map, no member lookup needed', async () => {
      useSharedListsStore.setState({ activeListId: 'list-1' });
      const handlers = await subscribeAndGetHandlers('list-1');

      handlers.onItemAdded?.(remoteItem);

      expect(useSharedListsStore.getState().items['movie-1']).toEqual(remoteItem);
    });

    it('onItemAdded ignores an event that arrives after the list was switched', async () => {
      useSharedListsStore.setState({ activeListId: 'list-1' });
      const handlers = await subscribeAndGetHandlers('list-1');
      useSharedListsStore.setState({ activeListId: 'list-2' });

      handlers.onItemAdded?.(remoteItem);

      expect(useSharedListsStore.getState().items['movie-1']).toBeUndefined();
    });

    it('onItemRemoved deletes the item by mediaId/mediaType directly, no rowId map needed', async () => {
      useSharedListsStore.setState({
        activeListId: 'list-1',
        items: { 'movie-1': remoteItem },
      });
      const handlers = await subscribeAndGetHandlers('list-1');

      handlers.onItemRemoved?.({ mediaId: 1, mediaType: 'movie' });

      expect(useSharedListsStore.getState().items['movie-1']).toBeUndefined();
    });

    it('onListDeleted drops the list from myLists and surfaces a detail error', async () => {
      const list: SharedListSummary = {
        id: 'list-1',
        name: 'Movie Night',
        createdBy: 'user-2',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        joinCode: 'ABCD1234',
      };
      useSharedListsStore.setState({ activeListId: 'list-1', myLists: { 'list-1': list } });
      const handlers = await subscribeAndGetHandlers('list-1');

      handlers.onListDeleted?.();

      expect(useSharedListsStore.getState().myLists['list-1']).toBeUndefined();
      expect(useSharedListsStore.getState().detailError).toBeTruthy();
    });

    it('onListRenamed patches the active list and its myLists entry directly', async () => {
      const list: SharedListSummary = {
        id: 'list-1',
        name: 'Old Name',
        createdBy: 'user-2',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        joinCode: 'ABCD1234',
      };
      useSharedListsStore.setState({
        activeListId: 'list-1',
        activeList: list,
        myLists: { 'list-1': list },
      });
      const handlers = await subscribeAndGetHandlers('list-1');

      handlers.onListRenamed?.({ name: 'New Name' });

      expect(useSharedListsStore.getState().activeList?.name).toBe('New Name');
      expect(useSharedListsStore.getState().myLists['list-1'].name).toBe('New Name');
    });
  });
});
