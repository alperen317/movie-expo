import {
  addListItem,
  castPollVote as castPollVoteRequest,
  joinListByCode as joinListByCodeRequest,
  removeListItem,
  respondToInvite as respondToInviteRequest,
  SharedListsError,
} from '../lib/supabase/sharedLists';
import { useSharedListsStore } from './sharedLists.store';
import { useToastStore } from './toast.store';

import type { MediaCardItem } from '../components/home/MovieCard';
import type {
  ListPoll,
  PendingInvite,
  SharedListItem,
  SharedListSummary,
} from '../lib/supabase/sharedLists';

jest.mock('../lib/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

// lib/supabase/sharedLists imports lib/supabase/client, which throws at
// import time without EXPO_PUBLIC_SUPABASE_* env vars -- mock the whole
// module boundary. SharedListsError is redefined locally (not pulled from
// the real module) so `instanceof` checks inside the store still resolve
// against *this* mock's class reference, which is all the store code needs.
jest.mock('../lib/supabase/sharedLists', () => {
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
    sendInviteEmail: jest.fn(),
    respondToInvite: jest.fn(),
    removeMember: jest.fn(),
    fetchListItems: jest.fn(),
    addListItem: jest.fn(),
    removeListItem: jest.fn(),
    fetchActivePoll: jest.fn(),
    startPoll: jest.fn(),
    castPollVote: jest.fn(),
    fetchListWatchSummary: jest.fn(),
    subscribeToList: jest.fn(),
    unsubscribeFromList: jest.fn(),
    sharedListItemFromRow: jest.fn(),
  };
});

const mockAddListItem = addListItem as jest.Mock;
const mockRemoveListItem = removeListItem as jest.Mock;
const mockRespondToInviteRequest = respondToInviteRequest as jest.Mock;
const mockCastPollVoteRequest = castPollVoteRequest as jest.Mock;
const mockJoinListByCodeRequest = joinListByCodeRequest as jest.Mock;

const item: MediaCardItem = {
  id: 1,
  mediaType: 'movie',
  title: 'Arrival',
  posterPath: null,
  voteAverage: 8,
  year: '2016',
  genres: ['Sci-Fi'],
};

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
      _listItemsByRowId: {},
    });
    mockAddListItem.mockReset();
    mockRemoveListItem.mockReset();
    mockRespondToInviteRequest.mockReset();
    mockCastPollVoteRequest.mockReset();
    mockJoinListByCodeRequest.mockReset();
  });

  afterEach(() => {
    // See episodeProgress.store.test.ts -- clears the toast auto-hide timer
    // so it doesn't keep the process alive after the suite finishes.
    useToastStore.getState().hide();
  });

  describe('addItem', () => {
    it('adds the item optimistically and keeps it once the request succeeds', async () => {
      mockAddListItem.mockResolvedValue('row-1');

      const pending = useSharedListsStore.getState().addItem('list-1', item);

      expect(useSharedListsStore.getState().items['movie-1']).toBeDefined();
      await pending;
      expect(useSharedListsStore.getState().items['movie-1'].title).toBe('Arrival');
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

      await expect(
        useSharedListsStore.getState().removeItem('list-1', 1, 'movie'),
      ).rejects.toThrow('network down');

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

      await expect(
        useSharedListsStore.getState().respondToInvite('inv-1', false),
      ).rejects.toThrow('network down');

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

    // Regression check for 0021/0022: a SharedListsError's own message
    // (the generic, non-enumerating one) must reach the toast, not a
    // different fallback string that could leak more or less detail.
    it('surfaces a SharedListsError message as-is instead of a generic fallback', async () => {
      mockJoinListByCodeRequest.mockRejectedValue(
        new SharedListsError('invalid_code', 'That code doesn’t match any list.'),
      );

      await expect(useSharedListsStore.getState().joinListByCode('BADCODE1')).rejects.toThrow();
    });
  });
});
