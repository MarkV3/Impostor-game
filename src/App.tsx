import React, { useMemo, useEffect } from 'react';
import { GameContext } from './game/GameContext';
import DisplayView from './components/display/DisplayView';
import PlayerView from './components/player/PlayerView';
import HostSetup from './components/display/HostSetup';
import { useGameSocket } from './game/useGameSocket';
import DesignPreview from './components/display/DesignPreview';

const ConnectedGame: React.FC = () => {
  const { socket, gameState, playerId, privatePrompt, error, view, setView, handleJoin } =
    useGameSocket();

  useEffect(() => {
    if (view.type === 'display' && view.code) {
      handleJoin(view.code, 'Display', 'display');
    }
  }, [view, handleJoin]);

  const me = useMemo(() => {
    if (!playerId || !gameState) return null;
    return gameState.players.find((p) => p.id === playerId) ?? null;
  }, [playerId, gameState]);

  const actions = useMemo(
    () => ({
      joinRoom: handleJoin,
      startGame: () => socket.emit('room:start'),
      submitAnswer: (text: string) => socket.emit('answer:submit', { text }),
      submitVote: (targetMemberId: string) => socket.emit('vote:submit', { targetMemberId }),
      restartGame: () => socket.emit('room:restart'),
      completeReveal: () => socket.emit('reveal:done'),
      continueRound: () => socket.emit('round:continue'),
    }),
    [handleJoin, socket],
  );

  const contextValue = useMemo(
    () => ({
      gameState,
      me,
      privatePrompt,
      error,
      actions,
    }),
    [gameState, me, privatePrompt, error, actions],
  );

  if (view.type === 'loading') {
    return <div className="game-app phone-screen">Loading...</div>;
  }

  return (
    <GameContext.Provider value={contextValue}>
      <div className="game-app">
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

const App: React.FC = () =>
  new URLSearchParams(window.location.search).has('preview') ? (
    <DesignPreview />
  ) : (
    <ConnectedGame />
  );

export default App;
