import React from 'react';
import { CheckIcon, PencilIcon } from '@heroicons/react/24/outline';
import type { Player } from '../../../shared/types';
import PlayerAvatar from '../ui/PlayerAvatar';
import GameMark from '../ui/GameMark';

export const ThinkingDots: React.FC = () => (
  <span className="thinking-dots" aria-hidden="true">
    <i />
    <i />
    <i />
  </span>
);

const TableLayout: React.FC<{ players: Player[]; answeredIds: Set<string> }> = ({
  players,
  answeredIds,
}) => (
  <div className="table-scene" aria-label="Players around the table">
    <div className="felt-table">
      <div className="table-inlay" />
      <div className="table-centre">
        <GameMark />
        <p>
          A different question.
          <br />A convincing answer.
        </p>
        <span>Keep yours to yourself.</span>
      </div>
    </div>
    {players.map((player, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / players.length;
      const ready = answeredIds.has(player.id);
      return (
        <div
          className={`table-seat ${ready ? 'is-ready' : 'is-writing'}`}
          key={player.id}
          style={{
            left: `calc(50% + var(--seat-radius-x, 42%) * ${Math.cos(angle)})`,
            top: `calc(50% + var(--seat-radius-y, 38%) * ${Math.sin(angle)})`,
          }}
        >
          <div className="seat-avatar">
            <PlayerAvatar name={player.name} index={index} />
          </div>
          <h2>{player.name}</h2>
          <div className="seat-activity" role="status">
            {ready ? <CheckIcon /> : <PencilIcon />}
            <span>{ready ? 'Answer in' : 'Writing'}</span>
            {!ready && <ThinkingDots />}
          </div>
        </div>
      );
    })}
  </div>
);
export default TableLayout;
