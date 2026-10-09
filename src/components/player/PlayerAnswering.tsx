import React, { useState, useContext } from 'react';
import { GameContext } from '../../game/GameContext';
import Button from '../ui/Button';
import PhoneHeader from './PhoneHeader';
import pacing from '../../../shared/presentation.json';

const PlayerAnswering: React.FC = () => {
  const [answer, setAnswer] = useState('');
  const { privatePrompt, actions, gameState } = useContext(GameContext);
  if (!privatePrompt || !gameState) return null;
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (answer.trim()) actions.submitAnswer(answer.trim());
  };
  return (
    <main className="phone-screen">
      <PhoneHeader />
      <div className="phone-body">
        <article className="prompt-card">
          <p className="eyebrow">Round {gameState.currentRound} · For your eyes only</p>
          <h1>{privatePrompt.text}</h1>
        </article>
        <form onSubmit={handleSubmit} className="phone-answer-form">
          <label className="field-label" htmlFor="player-answer">
            Play it cool. What’s your answer?
          </label>
          <textarea
            id="player-answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Your answer..."
            maxLength={pacing.answerMaxLength}
            rows={4}
            className="game-input"
            required
          />
          <div className="answer-form-meta">
            <span>A short answer is plenty. No rush.</span>
            <span>
              {answer.length} / {pacing.answerMaxLength}
            </span>
          </div>
          <Button type="submit" disabled={!answer.trim()}>
            Submit Answer
          </Button>
        </form>
        <p className="phone-footnote">Keep your question to yourself.</p>
      </div>
    </main>
  );
};
export default PlayerAnswering;
