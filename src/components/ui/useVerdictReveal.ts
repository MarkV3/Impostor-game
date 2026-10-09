import { useEffect, useState } from 'react';

// This timestamp controls only the shared reveal; results never expire.
export function useVerdictReveal(revealAt?: number) {
  const [revealed, setRevealed] = useState(() => revealAt !== undefined && Date.now() >= revealAt);
  useEffect(() => {
    if (revealAt === undefined) {
      setRevealed(false);
      return;
    }
    const delay = Math.max(0, revealAt - Date.now());
    setRevealed(delay === 0);
    const timer = window.setTimeout(() => setRevealed(true), delay);
    return () => window.clearTimeout(timer);
  }, [revealAt]);
  return revealed;
}
