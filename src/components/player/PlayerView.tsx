import React, { useContext } from 'react';
import { GameContext } from '../../game/GameContext';
import { GameStatus } from '../../../shared/types';
import PlayerJoin from './PlayerJoin';
import PlayerAnswering from './PlayerAnswering';
import PlayerVoting from './PlayerVoting';
import PlayerWaiting from './PlayerWaiting';
import PlayerSummary from './PlayerSummary';

const PlayerView: React.FC = () => {
  const { gameState, me } = useContext(GameContext);

  if (!me) {
    return <PlayerJoin />;
  }

  if (!gameState) {
    return <PlayerWaiting title="Connecting..." message="Waiting for game state." />;
  }

  switch (gameState.status) {
    case GameStatus.LOBBY:
      return <PlayerWaiting title="You're in!" message="Waiting for the game to start." />;
    case GameStatus.DISTRIBUTE_PROMPTS:
      return <PlayerWaiting title="Get Ready!" message="A new round is starting..." />;
    case GameStatus.ANSWERING: {
      const hasAnswered = gameState.answers.some((a) => a.playerId === me.id);
      return hasAnswered ? (
        <PlayerWaiting
          title="Answer Submitted"
          message="You’re good. Give your friends a moment."
        />
      ) : (
        <PlayerAnswering />
      );
    }
    case GameStatus.REVEAL:
      return (
        <PlayerWaiting
          title="Look up!"
          message="The cards are opening. Feel free to laugh, judge, or defend yourself."
        />
      );
    case GameStatus.DISCUSS_AND_VOTE: {
      const hasVoted = gameState.votes.some((v) => v.voterId === me.id);
      return <PlayerVoting hasVoted={hasVoted} />;
    }
    case GameStatus.SCORE:
      return <PlayerWaiting title="Calculating Scores..." message="Let's see who got points!" />;
    case GameStatus.SUMMARY:
      return <PlayerSummary />;
    case GameStatus.GAME_OVER:
      return <PlayerWaiting title="Game Over!" message="Check the main screen for final scores." />;
    default:
      return <PlayerWaiting title="Please Wait" message="The game is in an unknown state." />;
  }
};

export default PlayerView;
