import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, Player, GameStatus, ClientView } from './types';
import { GameContext } from './contexts/GameContext';
import { mockSocket } from './services/mockSocketService';
import { createServerSocket, ISocketLike } from './services/socketService';
import DisplayView from './components/Display/DisplayView';
import PlayerView from './components/Player/PlayerView';
import HostSetup from './components/Display/HostSetup';

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [view, setView] = useState<ClientView>({ type: 'loading' });
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [privatePrompt, setPrivatePrompt] = useState<{ text: string; role: 'citizen' | 'impostor' } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [socket] = useState<ISocketLike>(() => {
        try {
            return createServerSocket();
        } catch {
            return mockSocket as unknown as ISocketLike;
        }
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const host = params.get('host');
        const path = window.location.pathname;

        if (code) setView({ type: 'display', code });
        else if (host || path === '/host') setView({ type: 'host' });
        else setView({ type: 'player' });
    }, []);

    const handleJoin = useCallback((code: string, name: string, role: 'display' | 'player' = 'player') => {
        setError(null);
        socket.emit('room:join', { code, name, role });
    }, [socket]);
    
    useEffect(() => {
        socket.on('room:snapshot', (newState: GameState) => {
            setGameState(newState);
        });

        socket.on('prompt:deliver', (prompt: { text: string; role: 'citizen' | 'impostor' }) => {
            setPrivatePrompt(prompt);
        });

        socket.on('room:error', ({ message }: { message: string }) => {
            setError(message);
            // If join failed, reset view
            if(message.toLowerCase().includes('join')) {
                setView({ type: 'player' });
            }
        });

        socket.on('assign:id', (id: string) => {
            setPlayerId(id);
        });

        return () => {
            socket.off('room:snapshot');
            socket.off('prompt:deliver');
            socket.off('room:error');
            socket.off('assign:id');
        };
    }, [socket]);

    useEffect(() => {
        if (view.type === 'display' && view.code) {
            handleJoin(view.code, 'Display', 'display');
        }
    }, [view, handleJoin]);

    const me = useMemo(() => {
        if (!playerId || !gameState) return null;
        return gameState.players.find(p => p.id === playerId) ?? null;
    }, [playerId, gameState]);

    const actions = useMemo(() => ({
        joinRoom: handleJoin,
        startGame: () => socket.emit('room:start'),
        submitAnswer: (text: string) => socket.emit('answer:submit', { text }),
        submitVote: (targetMemberId: string) => socket.emit('vote:submit', { targetMemberId }),
        restartGame: () => socket.emit('room:restart'),
        completeReveal: () => socket.emit('reveal:done'),
    }), [handleJoin, socket]);

    const contextValue = useMemo(() => ({
        gameState,
        me,
        privatePrompt,
        error,
        actions,
    }), [gameState, me, privatePrompt, error, actions]);

    if (view.type === 'loading') {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;
    }

    return (
        <GameContext.Provider value={contextValue}>
            <div className="w-full min-h-screen bg-gray-900 text-white antialiased">
                {view.type === 'display' ? (
                    <DisplayView />
                ) : view.type === 'host' ? (
                    <HostSetup />
                ) : (
                    <PlayerView />
                )}
            </div>
        </GameContext.Provider>
    );
};

export default App;
