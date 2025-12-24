import React, { useMemo, useEffect } from 'react';
import { GameContext } from './contexts/GameContext';
import DisplayView from './components/Display/DisplayView';
import PlayerView from './components/Player/PlayerView';
import HostSetup from './components/Display/HostSetup';
import { useGameSocket } from './hooks/useGameSocket';

const App: React.FC = () => {
    const {
        socket,
        gameState,
        playerId,
        privatePrompt,
        error,
        view,
        setView,
        handleJoin
    } = useGameSocket();

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
