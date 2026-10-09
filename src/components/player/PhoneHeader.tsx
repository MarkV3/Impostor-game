import React, { useContext } from 'react';
import { GameContext } from '../../game/GameContext';
import GameMark from '../ui/GameMark';

const PhoneHeader: React.FC = () => {
  const { gameState } = useContext(GameContext);
  return (
    <header className="phone-topbar">
      <div className="game-brand">
        <GameMark />
        <span>
          Impostor<span className="brand-subtitle">PROMPT</span>
        </span>
      </div>
      <span className="eyebrow">
        {gameState?.currentRound
          ? `Round ${gameState.currentRound} / ${gameState.totalRounds}`
          : `Room ${gameState?.code}`}
      </span>
    </header>
  );
};
export default PhoneHeader;
