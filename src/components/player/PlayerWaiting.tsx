import React, { useContext } from 'react';
import { GameContext } from '../../game/GameContext';
import { GameStatus } from '../../../shared/types';
import PlayerAvatar from '../ui/PlayerAvatar';
import GameMark from '../ui/GameMark';
import PhoneHeader from './PhoneHeader';

const PlayerWaiting: React.FC<{ title: string; message: string }> = ({ title, message }) => {
  const { gameState, me } = useContext(GameContext);
  const ended = gameState?.status === GameStatus.GAME_OVER;
  const players = gameState?.players.filter((player) => !player.isDisplay) ?? [];
  const score = me ? (gameState?.leaderboard[me.id] ?? 0) : 0;
  const rank =
    1 + players.filter((player) => (gameState?.leaderboard[player.id] ?? 0) > score).length;
  return (
    <main className="phone-screen">
      <PhoneHeader />
      <div className="waiting-body">
        {me ? (
          <PlayerAvatar name={me.name} index={players.findIndex((player) => player.id === me.id)} />
        ) : (
          <GameMark />
        )}
        <p className="eyebrow">
          {ended
            ? `You finished in place ${rank}`
            : me
              ? `${me.name}, you’re good`
              : 'A little mystery awaits'}
        </p>
        <h1>{title}</h1>
        <p>{message}</p>
        {ended ? (
          <p className="phone-score">
            You finished with <strong>{score}</strong> point{score === 1 ? '' : 's'}.
          </p>
        ) : (
          <div className="waiting-indicator" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
    </main>
  );
};
export default PlayerWaiting;
