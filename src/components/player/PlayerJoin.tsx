import React, { useState, useContext } from 'react';
import { GameContext } from '../../game/GameContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import GameMark from '../ui/GameMark';

const PlayerJoin: React.FC = () => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const { actions, error } = useContext(GameContext);
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim() && code.trim()) actions.joinRoom(code.toUpperCase(), name.trim());
  };
  return (
    <main className="phone-screen">
      <div className="phone-body">
        <header className="phone-join-heading">
          <div className="game-brand">
            <GameMark />
            <span>
              Impostor<span className="brand-subtitle">PROMPT</span>
            </span>
          </div>
          <h1>
            Take a seat.
            <br />
            <em>Trust no one.</em>
          </h1>
          <p>Your friends are expecting you.</p>
        </header>
        <Card>
          <form onSubmit={handleSubmit} className="phone-form">
            <div>
              <label htmlFor="code" className="field-label">
                Room Code
              </label>
              <input
                id="code"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, ''))
                }
                placeholder="ABCDEF"
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="game-input code-input"
                required
              />
            </div>
            <div>
              <label htmlFor="name" className="field-label">
                Your Name
              </label>
              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="What should we call you?"
                maxLength={12}
                autoComplete="nickname"
                className="game-input"
                required
              />
            </div>
            <Button type="submit" disabled={!name.trim() || code.length !== 6}>
              Join Game
            </Button>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </form>
        </Card>
        <p className="phone-footnote">Your phone is your hand. The big screen is the table.</p>
      </div>
    </main>
  );
};
export default PlayerJoin;
