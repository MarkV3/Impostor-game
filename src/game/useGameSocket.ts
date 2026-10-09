import { useState, useEffect, useCallback } from 'react';
import { createServerSocket, type GameSocket } from '../lib/socket';
import { GameState, ClientView } from '../../shared/types';
import type { PrivatePrompt } from '../../shared/protocol';

export function useGameSocket() {
  const [socket] = useState<GameSocket>(createServerSocket);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
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
    });

    socket.on('prompt:deliver', (prompt: PrivatePrompt) => {
      setPrivatePrompt(prompt);
    });

    socket.on('room:error', ({ message }: { message: string }) => {
      setError(message);
      if (message.toLowerCase().includes('join')) {
        setView({ type: 'player' });
      }
    });

    socket.on('assign:id', (id: string) => {
      setPlayerId(id);
    });

    socket.connect();

    return () => {
      socket.disconnect();
      socket.off('room:snapshot');
      socket.off('prompt:deliver');
      socket.off('room:error');
      socket.off('assign:id');
    };
  }, [socket]);

  return {
    socket,
    gameState,
    playerId,
    privatePrompt,
    error,
    view,
    setView,
    handleJoin,
  };
}
