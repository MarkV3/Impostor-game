import React, { useContext } from 'react';
import { GameContext } from '../../game/GameContext';
import { GameStatus } from '../../../shared/types';
import DisplayLobby from './DisplayLobby';
import DisplayRound from './DisplayRound';
import DisplayGameOver from './DisplayGameOver';
import Spinner from '../ui/Spinner';
import PhaseTransition from '../ui/PhaseTransition';

const DisplayView: React.FC = () => {
  const { gameState } = useContext(GameContext);

  if (!gameState) {
    return (
      <div className="phone-screen text-center">
        <Spinner />
        <h1 className="text-2xl mt-4 font-bold">Connecting to Room...</h1>
        <p className="muted">Make sure the room code in the URL is correct.</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (gameState.status) {
      case GameStatus.LOBBY:
        return <DisplayLobby />;
      case GameStatus.GAME_OVER:
        return <DisplayGameOver />;
      case GameStatus.ANSWERING:
      case GameStatus.REVEAL:
      case GameStatus.DISCUSS_AND_VOTE:
      case GameStatus.SUMMARY:
      case GameStatus.DISTRIBUTE_PROMPTS:
      case GameStatus.SCORE:
        return <DisplayRound key={Math.max(1, gameState.currentRound)} />;
      default:
        return <div>Unknown game state</div>;
    }
  };

  return (
    <div className="shared-display">
      <PhaseTransition
        statusKey={
          gameState.status === GameStatus.LOBBY || gameState.status === GameStatus.GAME_OVER
            ? gameState.status
            : 'round'
        }
      >
        {renderContent()}
      </PhaseTransition>
    </div>
  );
};

export default DisplayView;
