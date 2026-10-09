import React, { useContext } from 'react';
import { GameContext } from '../../game/GameContext';
import { GameStatus } from '../../../shared/types';
import GameMark from '../ui/GameMark';
import DisplayFit from './DisplayFit';

const DisplayFrame: React.FC<{
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}> = ({ children, footer, className = '' }) => {
  const { gameState } = useContext(GameContext);
  const inRound = (gameState?.currentRound ?? 0) > 0 && gameState?.status !== GameStatus.GAME_OVER;
  return (
    <main className={`display-frame ${className}`}>
      <header className="display-header">
        <div className="game-brand">
          <GameMark />
          <span>
            Impostor<span className="brand-subtitle">PROMPT</span>
          </span>
        </div>
        <p className="header-motto">Good friends. Questionable answers.</p>
        <div className="round-meta">
          <span className="eyebrow">
            {inRound ? (
              <>
                Round <strong>{gameState?.currentRound}</strong>
                <span className="muted"> / {gameState?.totalRounds}</span>
              </>
            ) : (
              <>
                {gameState?.totalRounds} rounds ·{' '}
                {gameState?.players.filter((player) => !player.isDisplay).length} friends
              </>
            )}
          </span>
        </div>
      </header>
      <div className="display-content">
        {className.includes('round-frame') ? <DisplayFit>{children}</DisplayFit> : children}
      </div>
      <footer className="display-footer">
        <span>{footer}</span>
        <span className="room-stamp">
          <i />
          Room <strong>{gameState?.code}</strong>
        </span>
      </footer>
    </main>
  );
};
export default DisplayFrame;
