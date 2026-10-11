import React, { useMemo, useEffect } from 'react';
import { GameContext } from './game/GameContext';
import DisplayView from './components/display/DisplayView';
import PlayerView from './components/player/PlayerView';
import HostSetup from './components/display/HostSetup';
import { useGameSocket } from './game/useGameSocket';
import DesignPreview from './components/display/DesignPreview';

const ConnectedGame: React.FC = () => {
  const { socket, connected, gameState, playerId, privatePrompt, error, view, handleJoin } =
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
      startGame: () => {
        if (socket.connected) socket.emit('room:start');
      },
      submitAnswer: (text: string) => {
        if (socket.connected) socket.emit('answer:submit', { text });
      },
      submitVote: (targetMemberId: string) => {
        if (socket.connected) socket.emit('vote:submit', { targetMemberId });
      },
      restartGame: () => {
        if (socket.connected) socket.emit('room:restart');
      },
      completeReveal: () => {
        if (socket.connected) socket.emit('reveal:done');
      },
      continueRound: () => {
        if (socket.connected) socket.emit('round:continue');
      },
    }),
    [handleJoin, socket],
  );

  const contextValue = useMemo(
    () => ({
      connected,
      gameState,
      me,
      privatePrompt,
      error,
      actions,
    }),
    [connected, gameState, me, privatePrompt, error, actions],
  );

  if (view.type === 'loading') {
    return <div className="game-app phone-screen">Loading...</div>;
  }

  return (
    <GameContext.Provider value={contextValue}>
      <div className="game-app">
        {gameState && !connected && (
          <p className="connection-notice" role="status">
            Reconnecting… Your place in the game is saved.
          </p>
        )}
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
