import React, { useContext } from 'react';
import { TrophyIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { GameContext } from '../../game/GameContext';
import DisplayFrame from './DisplayFrame';
import PlayerAvatar from '../ui/PlayerAvatar';
import Button from '../ui/Button';

const DisplayGameOver: React.FC = () => {
  const { gameState, actions } = useContext(GameContext);
  if (!gameState) return null;
  const players = gameState.players.filter((player) => !player.isDisplay);
  const sorted = [...players].sort(
    (a, b) => (gameState.leaderboard[b.id] ?? 0) - (gameState.leaderboard[a.id] ?? 0),
  );
  const highScore = gameState.leaderboard[sorted[0]?.id] ?? 0;
  const winners = sorted.filter((player) => (gameState.leaderboard[player.id] ?? 0) === highScore);
  return (
    <DisplayFrame
      className="game-over-frame"
      footer="Same friends. Another round of questionable answers?"
    >
      <section className="finale-layout">
        <div className="winner-panel">
          <h1 className="eyebrow">Game Over</h1>
          <div className="winner-medallion">
            <TrophyIcon />
            <span aria-hidden="true">✦</span>
            <span aria-hidden="true">✦</span>
          </div>
          <p className="winner-intro">
            {winners.length > 1 ? 'A shared victory for' : 'A toast to'}
          </p>
          <h2 className={winners.length > 2 ? 'many-winners' : ''}>
            {winners.map((player) => player.name).join(' & ')}.
          </h2>
          <p className="winner-score">
            <strong>{highScore}</strong> point{highScore === 1 ? '' : 's'} · {gameState.totalRounds}{' '}
            rounds of friendly arguments
          </p>
          <div className="finale-action">
            <Button onClick={actions.restartGame}>
              <ArrowPathIcon />
              Restart Game
            </Button>
            <p>Keep the room. Deal a new game.</p>
          </div>
        </div>
        <div className="final-scoreboard">
          <div className="scoreboard-heading">
            <div>
              <p className="eyebrow">All cards on the table</p>
              <h2>Final standings</h2>
            </div>
            <span className="eyebrow">Points</span>
          </div>
          <div className="score-rows">
            {sorted.map((player) => {
              const score = gameState.leaderboard[player.id] ?? 0;
              const rank =
                sorted.findIndex((item) => (gameState.leaderboard[item.id] ?? 0) === score) + 1;
              return (
                <div
                  className={`score-row ${score === highScore ? 'winning-row' : ''}`}
                  key={player.id}
                >
                  <span className="rank-number">{String(rank).padStart(2, '0')}</span>
                  <PlayerAvatar name={player.name} index={players.indexOf(player)} />
                  <div className="score-player">
                    <strong>{player.name}</strong>
                    {score === highScore && (
                      <small>{winners.length > 1 ? 'Joint winner' : 'Nicely played'}</small>
                    )}
                  </div>
                  <strong className="score-total">{score}</strong>
                  {score === highScore && <TrophyIcon className="row-trophy" />}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </DisplayFrame>
  );
};
export default DisplayGameOver;
