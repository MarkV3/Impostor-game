import { useState, useEffect, useCallback, useRef } from 'react';
import { createServerSocket, type GameSocket } from '../lib/socket';
import { GameState, ClientView } from '../../shared/types';
import type { PrivatePrompt } from '../../shared/protocol';

export function useGameSocket() {
  const [socket] = useState<GameSocket>(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const isHostSetup = params.has('host') || window.location.pathname === '/host';
    return createServerSocket(
      code
        ? `impostor:display-session:${code}`
        : isHostSetup
          ? undefined
          : 'impostor:player-session',
    );
  });
  const [connected, setConnected] = useState(false);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const identity = useRef<string | null>(null);
  const [privatePrompt, setPrivatePrompt] = useState<PrivatePrompt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ClientView>({ type: 'loading' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const host = params.get('host');
    const path = window.location.pathname;

    if (code) setView({ type: 'display', code });
    else if (host || path === '/host') setView({ type: 'host' });
    else setView({ type: 'player' });
  }, []);

  const handleJoin = useCallback(
    (code: string, name: string, role: 'display' | 'player' = 'player') => {
      setError(null);
      socket.emit('room:join', { code, name, role });
    },
    [socket],
  );

  useEffect(() => {
    socket.on('room:snapshot', (newState: GameState) => {
      setGameState(newState);
      if (newState.status === 'LOBBY') setPrivatePrompt(null);
    });

    socket.on('prompt:deliver', (prompt: PrivatePrompt) => {
      setPrivatePrompt(prompt);
    });

    socket.on('room:error', ({ message }: { message: string }) => {
      setError(message);
    });

    socket.on('assign:id', (id: string) => {
      if (identity.current && identity.current !== id) {
        setGameState(null);
        setPrivatePrompt(null);
      }
      identity.current = id;
      setPlayerId(id);
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    const reconnect = () => {
      if (!socket.connected) socket.connect();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') reconnect();
    };
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', onVisible);

    socket.connect();

    return () => {
      socket.disconnect();
      socket.off('room:snapshot');
      socket.off('prompt:deliver');
      socket.off('room:error');
      socket.off('assign:id');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [socket]);

  return {
    socket,
    connected,
    gameState,
    playerId,
    privatePrompt,
    error,
    view,
    setView,
    handleJoin,
  };
}
