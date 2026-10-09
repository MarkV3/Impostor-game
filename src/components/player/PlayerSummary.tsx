import React, { useContext } from 'react';
import { CheckIcon, EyeIcon } from '@heroicons/react/24/outline';
import { GameContext } from '../../game/GameContext';
import { useVerdictReveal } from '../ui/useVerdictReveal';
import PlayerWaiting from './PlayerWaiting';
import PhoneHeader from './PhoneHeader';
import pacing from '../../../shared/presentation.json';

const PlayerSummary: React.FC = () => {
  const { gameState, me } = useContext(GameContext);
  const revealed = useVerdictReveal(gameState?.verdictRevealsAt);
  const scoresReady = useVerdictReveal(
    gameState?.verdictRevealsAt === undefined
      ? undefined
      : gameState.verdictRevealsAt + pacing.scoresDelayMs,
  );
  if (!gameState || !me) return null;
  if (!revealed)
    return (
      <PlayerWaiting
        title="Moment of truth…"
        message="Look up. The impostor is about to be revealed."
      />
    );
  const myPoints = gameState.pointsThisRound?.[me.id] ?? 0;
  const isImpostor = me.id === gameState.impostorId;
  const correctVote =
    gameState.votes.find((vote) => vote.voterId === me.id)?.targetId === gameState.impostorId;
  const message = isImpostor
    ? myPoints > 0
      ? 'You fooled them!'
      : 'You were caught!'
    : correctVote
      ? 'Good instincts.'
      : 'A convincing alibi.';
  return (
    <main className="phone-screen">
      <PhoneHeader />
      <div className="waiting-body">
        <div className="phone-result-symbol">{myPoints > 0 ? <CheckIcon /> : <EyeIcon />}</div>
        <p className="eyebrow">
          Round {gameState.currentRound} · {isImpostor ? 'The impostor' : 'The detective'}
        </p>
        <h1>{message}</h1>
        <p>
          {isImpostor
            ? myPoints > 0
              ? 'You blended in beautifully.'
              : 'Your friends saw through the disguise.'
            : correctVote
              ? 'You found the impostor.'
              : 'Your suspect was innocent this time.'}
        </p>
        {scoresReady ? (
          <>
            <p className="phone-score">
              You scored <strong>{myPoints}</strong> point{myPoints === 1 ? '' : 's'}.
            </p>
            <p className="phone-total">{gameState.leaderboard[me.id] ?? 0} points so far</p>
          </>
        ) : (
          <p className="phone-footnote">Look up to see who voted for whom. Scores are next.</p>
        )}
        <p className="phone-footnote">
          {gameState.currentRound < gameState.totalRounds
            ? 'Ready for another? The host will start the next one.'
            : 'Look up for the final standings.'}
        </p>
      </div>
    </main>
  );
};
export default PlayerSummary;
