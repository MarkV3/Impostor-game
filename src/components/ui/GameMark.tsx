import React from 'react';

const GameMark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 48 56" fill="none" aria-hidden="true">
    <rect
      x="5"
      y="5"
      width="36"
      height="46"
      rx="7"
      transform="rotate(-8 23 28)"
      fill="currentColor"
      opacity=".28"
    />
    <rect x="9" y="4" width="34" height="46" rx="7" fill="currentColor" />
    <path d="M15 23c6-5 16-5 22 0l-3 9H18l-3-9Z" fill="var(--ink, #142921)" />
    <circle cx="22" cy="26" r="2" fill="currentColor" />
    <circle cx="30" cy="26" r="2" fill="currentColor" />
    <path d="m25 10 2 3-2 3-2-3 2-3Zm0 28 2 3-2 3-2-3 2-3Z" fill="var(--ink, #142921)" />
  </svg>
);
export default GameMark;
