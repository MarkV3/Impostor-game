import React from 'react';

const PlayerAvatar: React.FC<{ name: string; index?: number; className?: string }> = ({
  name,
  index = 0,
  className = '',
}) => (
  <span className={`player-avatar avatar-tone-${index % 10} ${className}`} aria-hidden="true">
    {name.slice(0, 1).toUpperCase()}
  </span>
);
export default PlayerAvatar;
