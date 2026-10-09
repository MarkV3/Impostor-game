import React, { useEffect, useMemo, useState } from 'react';
import { GameContext } from '../../game/GameContext';
import { GameStatus, type GameState } from '../../../shared/types';
import DisplayView from './DisplayView';
import pacing from '../../../shared/presentation.json';

const phases = [
  GameStatus.LOBBY,
  GameStatus.ANSWERING,
  GameStatus.REVEAL,
  GameStatus.DISCUSS_AND_VOTE,
  GameStatus.SUMMARY,
  GameStatus.GAME_OVER,
];
const labels = ['Lobby', 'Write', 'Reveal', 'Discuss', 'Results', 'Finale'];
const names = ['Maya', 'Felix', 'Olive', 'Theo', 'June', 'Luca', 'Nina', 'Hugo', 'Iris', 'Ezra'];
const samples = [
  'A hammock',
  'My best friend',
  'A suspiciously large suitcase',
  'A water filter',
  'A solar charger',
  'Snacks. Obviously.',
  'A good book',
  'A satellite phone',
  'Sunscreen',
  'A very optimistic attitude',
];

// Local sample players: the actual game still waits for people, not a clock.
const DesignPreview: React.FC = () => {
  const [phase, setPhase] = useState(1);
  const [count, setCount] = useState(6);
  const [longAnswers, setLongAnswers] = useState(false);
  const [readyCount, setReadyCount] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now);
  const [replay, setReplay] = useState(0);
  const goTo = (index: number) => {
    if (index === 1 || (index === 2 && phase !== 1)) {
      setReplay((value) => value + 1);
      setReadyCount(0);
    }
    setPhase(index);
    setStartedAt(Date.now());
  };
  useEffect(() => {
    if (phase !== 1) return;
    const timer = window.setTimeout(() => {
      if (readyCount >= count) goTo(2);
      else setReadyCount((value) => value + 1);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [phase, readyCount, count, replay]);
  const gameState = useMemo<GameState>(() => {
    const players = names
      .slice(0, count)
      .map((name, index) => ({ id: `sample-${index}`, name, isHost: false, isDisplay: false }));
    const answers = players.map((player, index) => ({
      playerId: player.id,
      name: player.name,
      text: longAnswers
        ? `${samples[index]}. I thought about it for a while, but honestly this is the one thing I would want with me. My friends might disagree, and I am prepared to defend this extremely questionable decision.`.slice(
            0,
            pacing.answerMaxLength,
          )
        : samples[index],
    }));
    const votes = players.map((player, index) => ({
      voterId: player.id,
      targetId: index === 2 || index === 3 ? 'sample-0' : 'sample-2',
    }));
    const caught = votes.filter((vote) => vote.targetId === 'sample-2').length > count / 2;
    return {
      code: 'NIGHTS',
      status: phases[phase],
      players,
      leaderboard: Object.fromEntries(
        players.map((player, index) => [player.id, Math.max(1, 5 - index)]),
      ),
      currentRound: phase === 0 ? 0 : 6,
      totalRounds: 6,
      answers: phase === 1 ? answers.slice(0, readyCount) : answers,
      votes: phase === 3 ? votes.slice(0, 2) : phase === 4 || phase === 5 ? votes : [],
      impostorId: 'sample-2',
      mainQuestion: 'What would you bring to a deserted island?',
      pointsThisRound: Object.fromEntries(
        players.map((player, index) => [
          player.id,
          index === 2 ? Number(!caught) : Number(votes[index].targetId === 'sample-2'),
        ]),
      ),
      verdictRevealsAt: phase === 4 ? startedAt + pacing.verdictDelayMs : undefined,
      config: { minPlayersToStart: 3 },
    };
  }, [phase, count, longAnswers, readyCount, startedAt]);
  const actions = {
    joinRoom: () => {},
    startGame: () => goTo(1),
    submitAnswer: () => {},
    submitVote: () => {},
    restartGame: () => goTo(0),
    completeReveal: () => goTo(3),
    continueRound: () => goTo(5),
  };
  return (
    <GameContext.Provider
      value={{ gameState, me: null, privatePrompt: null, error: null, actions }}
    >
      <div className="game-app preview-shell">
        <DisplayView key={`${replay}-${count}-${longAnswers}`} />
        <aside className="preview-bar" aria-label="Sample round controls">
          <div className="preview-label">
            Try a round<small>Sample friends · no real room</small>
          </div>
          <div className="preview-controls">
            {phase === 3 && (
              <button className="demo-vote-button" onClick={() => goTo(4)}>
                Everyone votes →
              </button>
            )}
            {labels.map((label, index) => (
              <button
                className={phase === index ? 'is-selected' : ''}
                aria-pressed={phase === index}
                onClick={() => goTo(index)}
                key={label}
              >
                {label}
              </button>
            ))}
            <select
              aria-label="Sample player count"
              value={count}
              onChange={(event) => {
                setCount(Number(event.target.value));
                setReadyCount(0);
                setStartedAt(Date.now());
              }}
            >
              <option value={3}>3 players</option>
              <option value={6}>6 players</option>
              <option value={10}>10 players</option>
            </select>
            <label className="preview-long">
              <input
                type="checkbox"
                checked={longAnswers}
                onChange={(event) => {
                  setLongAnswers(event.target.checked);
                  setStartedAt(Date.now());
                }}
              />
              Long answers
            </label>
            <a href="/host">Host a game ↗</a>
          </div>
        </aside>
      </div>
    </GameContext.Provider>
  );
};
export default DesignPreview;
