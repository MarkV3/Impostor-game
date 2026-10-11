import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/protocol';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createServerSocket(sessionKey?: string): GameSocket {
  // Both production and the Vite development proxy use the page's origin.
  // Connect after listeners are installed; effects own connection cleanup.
  let token: string | null = null;
  const socket: GameSocket = io({
    transports: ['websocket'],
    withCredentials: true,
    autoConnect: false,
    auth: (reply) => {
      try {
        if (sessionKey) token = sessionStorage.getItem(sessionKey) ?? token;
      } catch {
        // Recovery still works within this page when browser storage is unavailable.
      }
      reply({ sessionToken: token });
    },
  });
  socket.on('assign:session', (session) => {
    token = session.token;
    try {
      if (sessionKey) sessionStorage.setItem(sessionKey, token);
    } catch {
      // Keep the in-memory token for reconnects even if storage is blocked.
    }
  });
  return socket;
}
