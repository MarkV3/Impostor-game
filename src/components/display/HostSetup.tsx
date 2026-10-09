import React, { useEffect, useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import GameMark from '../ui/GameMark';
import { createServerSocket } from '../../lib/socket';

const fields = [
  { key: 'players', label: 'Min Players to Start', hint: '3–10 friends', min: 3, max: 10 },
  { key: 'rounds', label: 'Total Rounds', hint: '2–10 chances to bluff', min: 2, max: 10 },
] as const;
const HostSetup: React.FC = () => {
  const socket = useMemo(() => createServerSocket(), []);
  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [socket]);
  const [settings, setSettings] = useState({ players: '4', rounds: '6' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalize = (field: (typeof fields)[number]) =>
    Math.max(field.min, Math.min(field.max, parseInt(settings[field.key], 10) || field.min));
  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const [minPlayersToStart, totalRounds] = fields.map(normalize);
    setSettings({ players: String(minPlayersToStart), rounds: String(totalRounds) });
    socket.emit('room:create', { minPlayersToStart, totalRounds }, (result) => {
      setBusy(false);
      if (!result?.ok) {
        setError('Could not start a room. Try again?');
        return;
      }
      window.location.href = `/?code=${result.code}`;
    });
  };
  return (
    <main className="host-setup">
      <div className="game-brand">
        <GameMark />
        <span>
          Impostor<span className="brand-subtitle">PROMPT</span>
        </span>
      </div>
      <div className="host-intro">
        <p className="eyebrow">Get your friends together</p>
        <h1>Host a Game</h1>
        <p>A few questions. A few questionable answers.</p>
      </div>
      <Card>
        <form onSubmit={handleCreate}>
          <div className="settings-grid">
            {fields.map((field) => (
              <div key={field.key}>
                <label htmlFor={`setting-${field.key}`} className="field-label">
                  {field.label}
                </label>
                <input
                  id={`setting-${field.key}`}
                  className="game-input"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={settings[field.key]}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      [field.key]: event.target.value.replace(/[^0-9]/g, ''),
                    })
                  }
                  onBlur={() => setSettings({ ...settings, [field.key]: String(normalize(field)) })}
                  aria-describedby={`hint-${field.key}`}
                />
                <p className="field-hint" id={`hint-${field.key}`}>
                  {field.hint}
                </p>
              </div>
            ))}
          </div>
          <p className="no-clock-note">No clocks. Answer, argue, and vote at your own pace.</p>
          <Button type="submit" disabled={busy}>
            {busy ? 'Getting things ready…' : 'Create Game'}
          </Button>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </Card>
      <a className="preview-link" href="/?preview=1">
        Try a sample round <span aria-hidden="true">→</span>
      </a>
    </main>
  );
};
export default HostSetup;
