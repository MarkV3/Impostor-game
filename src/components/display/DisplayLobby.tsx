import React, { useContext, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ClipboardDocumentIcon, CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { GameContext } from '../../game/GameContext';
import Button from '../ui/Button';
import DisplayFrame from './DisplayFrame';
import PlayerAvatar from '../ui/PlayerAvatar';

const DisplayLobby: React.FC = () => {
  const { gameState, actions } = useContext(GameContext);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  if (!gameState) return null;
  const joinUrl = window.location.origin;
  const players = gameState.players.filter((player) => !player.isDisplay);
  const minimum = gameState.config?.minPlayersToStart ?? 4;
  const canStart = players.length >= minimum;
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  };
  return (
    <DisplayFrame
      className="lobby-frame"
      footer="One question is different. One friend is very convincing."
    >
      <section className="lobby-layout">
        <div className="lobby-invitation">
          <p className="eyebrow">
            <span className="live-dot" />
            The table is open
          </p>
          <h1>
            Good company.
            <br />
            <em>Bad alibis.</em>
          </h1>
          <p className="lobby-description">
            A game of innocent answers
            <br />
            and suspicious friends.
          </p>
          <div className="join-details">
            <div className="qr-card">
              <QRCodeSVG value={joinUrl} size={156} fgColor="#142921" bgColor="#f4efdf" />
              <span>Scan to join</span>
            </div>
            <div className="join-instructions">
              <p className="eyebrow">Join on your phone</p>
              <div className="join-url">
                <span>{window.location.host}</span>
                <button
                  className="icon-button"
                  onClick={handleCopy}
                  aria-label={copied ? 'Link copied' : 'Copy join link'}
                >
                  {copied ? <CheckIcon /> : <ClipboardDocumentIcon />}
                </button>
              </div>
              <p className="join-code-label">Then enter the room code</p>
              <strong className="room-code">{gameState.code}</strong>
              {copyError && <p className="copy-note">Use the address above to join.</p>}
            </div>
          </div>
        </div>
        <div className="lobby-guestlist">
          <header>
            <p className="eyebrow">Your partners in suspicion</p>
            <h2>Players ({players.length}/10)</h2>
          </header>
          <div className="guest-list">
            {players.map((player, index) => (
              <div className="guest-row" key={player.id}>
                <PlayerAvatar name={player.name} index={index} />
                <strong>{player.name}</strong>
                <span>
                  Seated <CheckIcon />
                </span>
              </div>
            ))}
            {Array.from({ length: Math.max(0, minimum - players.length) }, (_, index) => (
              <div className="guest-row empty-seat" key={`empty-${index}`}>
                <span className="empty-avatar">+</span>
                <span>An open seat</span>
              </div>
            ))}
          </div>
          <div className="lobby-start">
            <p>
              {canStart
                ? 'Everyone comfortable? Let the suspicion begin.'
                : `Gather at least ${minimum} friends to start.`}
            </p>
            <Button onClick={actions.startGame} disabled={!canStart}>
              {canStart ? (
                <>
                  Start Game <ArrowRightIcon />
                </>
              ) : (
                `Need ${Math.max(0, minimum - players.length)} more players`
              )}
            </Button>
          </div>
        </div>
      </section>
    </DisplayFrame>
  );
};
export default DisplayLobby;
