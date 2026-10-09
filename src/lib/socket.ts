import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/protocol';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createServerSocket(): GameSocket {
  // Both production and the Vite development proxy use the page's origin.
  // Connect after listeners are installed; effects own connection cleanup.
  return io({ transports: ['websocket'], withCredentials: true, autoConnect: false });
}
