import React, { useState, useContext } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { GameContext } from '../../game/GameContext';
import PlayerAvatar from '../ui/PlayerAvatar';
import PhoneHeader from './PhoneHeader';

const PlayerVoting: React.FC<{ hasVoted: boolean }> = ({ hasVoted }) => {
  const { gameState, me, actions, connected } = useContext(GameContext);
  const serverSelection = gameState?.votes.find((vote) => vote.voterId === me?.id)?.targetId;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>(serverSelection);
  if (!gameState || !me) return null;
  const players = gameState.players.filter((player) => !player.isDisplay);
  const selected = selectedPlayerId ?? serverSelection;
  const handleVote = (id: string) => {
    setSelectedPlayerId(id);
    actions.submitVote(id);
  };
  return (
    <main className="phone-screen">
      <PhoneHeader />
      <div className="phone-body">
        <div className="phone-vote-heading">
          <p className="eyebrow">Round {gameState.currentRound} · Trust your instinct</p>
          <h1>Who is the Impostor?</h1>
          <p>
            Talk it out first. Then choose who got
            <br />a different question.
          </p>
        </div>
        <blockquote className="phone-question">{gameState.mainQuestion}</blockquote>
        <div className="vote-options">
          {players
            .filter((player) => player.id !== me.id)
            .map((player) => (
              <button
                key={player.id}
                disabled={!connected}
                onClick={() => handleVote(player.id)}
                aria-label={player.name}
                aria-pressed={selected === player.id}
                className={`vote-option ${selected === player.id ? 'is-selected' : ''}`}
              >
                <PlayerAvatar name={player.name} index={players.indexOf(player)} />
                <span>{player.name}</span>
                <span className="vote-check" aria-hidden="true">
                  {selected === player.id && <CheckIcon />}
                </span>
              </button>
            ))}
        </div>
        {hasVoted && (
          <p className="vote-receipt" role="status">
            Vote for <strong>{players.find((player) => player.id === selected)?.name}</strong>{' '}
            recorded! You can change it until everyone has voted. Take your time.
          </p>
        )}
      </div>
    </main>
  );
};
export default PlayerVoting;
