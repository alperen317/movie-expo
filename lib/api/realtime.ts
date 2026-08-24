import {
  HttpTransportType,
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr';

import { ensureValidToken } from './client';
import { API_BASE_URL } from './config';
import type { SharedListItem } from './sharedLists';

export interface ItemRemovedPayload {
  mediaId: number;
  mediaType: 'movie' | 'tv';
}

export interface ListRenamedPayload {
  name: string;
}

export interface ListRealtimeHandlers {
  onItemAdded?: (item: SharedListItem) => void;
  onItemRemoved?: (payload: ItemRemovedPayload) => void;
  onMembersChanged?: () => void;
  onListRenamed?: (payload: ListRenamedPayload) => void;
  onListDeleted?: () => void;
  onPollUpdated?: () => void;
}

// One connection for the whole app lifetime rather than one per list --
// ListHub group membership (see JoinList/LeaveList below) is what actually
// scopes events to a single list, the same role a Supabase Realtime channel
// played before.
let connection: HubConnection | null = null;
let connecting: Promise<HubConnection> | null = null;

// Group membership lives on the connection, not the client -- a dropped and
// automatically-reconnected socket gets a new connection id server-side and
// silently stops receiving events for any list it had joined. Re-issuing
// JoinList for everything this client cares about is how that recovers.
const activeListIds = new Set<string>();

async function getConnection(): Promise<HubConnection> {
  if (connection) return connection;
  if (connecting) return connecting;

  connecting = (async () => {
    const hub = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/list`, {
        // skipNegotiation + WebSockets bypasses SignalR's HTTP negotiate
        // handshake, which is the flaky part under React Native. The token
        // rides along as a query param -- the server only honours that under
        // /hubs, the same accommodation it makes for browser WebSocket
        // clients (which can't set an Authorization header on the handshake
        // either).
        accessTokenFactory: async () => (await ensureValidToken()) ?? '',
        skipNegotiation: true,
        transport: HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    hub.onreconnected(() => {
      activeListIds.forEach((listId) => {
        hub.invoke('JoinList', listId).catch(() => {
          // Best-effort -- the affected screen's own reconnect-on-foreground
          // path (see sharedLists.store.ts#refreshActiveList) is the backstop.
        });
      });
    });

    await hub.start();
    connection = hub;
    return hub;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

export interface ListSubscription {
  listId: string;
  hub: HubConnection;
  listeners: [string, (...args: any[]) => void][];
}

export async function subscribeToList(
  listId: string,
  handlers: ListRealtimeHandlers,
): Promise<ListSubscription> {
  const hub = await getConnection();
  activeListIds.add(listId);
  await hub.invoke('JoinList', listId);

  const listeners: ListSubscription['listeners'] = [
    ['ItemAdded', (item: SharedListItem) => handlers.onItemAdded?.(item)],
    ['ItemRemoved', (payload: ItemRemovedPayload) => handlers.onItemRemoved?.(payload)],
    ['MembersChanged', () => handlers.onMembersChanged?.()],
    ['ListRenamed', (payload: ListRenamedPayload) => handlers.onListRenamed?.(payload)],
    ['ListDeleted', () => handlers.onListDeleted?.()],
    ['PollUpdated', () => handlers.onPollUpdated?.()],
  ];
  for (const [event, listener] of listeners) hub.on(event, listener);

  return { listId, hub, listeners };
}

export async function unsubscribeFromList(subscription: ListSubscription): Promise<void> {
  for (const [event, listener] of subscription.listeners) subscription.hub.off(event, listener);
  activeListIds.delete(subscription.listId);

  try {
    await subscription.hub.invoke('LeaveList', subscription.listId);
  } catch {
    // Best-effort -- if the connection already dropped there's nothing to
    // leave, and the group membership dies with it anyway.
  }
}

// Called on sign-out: an idle connection would otherwise sit there retrying
// its automatic reconnect forever with a token that's no longer valid.
export async function stopRealtimeConnection(): Promise<void> {
  activeListIds.clear();
  const hub = connection;
  connection = null;
  connecting = null;

  if (hub) {
    try {
      await hub.stop();
    } catch {
      // Best-effort teardown.
    }
  }
}
