import { useEffect, useRef, useState } from 'react';
import { GameStatus, type Answer, type GameState } from '../../../shared/types';

export const answerHoldMs = (text: string) =>
  Math.min(14000, Math.max(6500, 3500 + text.length * 55));
export const CARD_SETTLE_MS = 1100;
export const QUESTION_HOLD_MS = 5500;
export const QUESTION_SETTLE_MS = 1100;
type RevealBeat =
  'waiting' | 'reading' | 'settling' | 'question-reading' | 'question-settling' | 'question';

export function useAnswerReveal(gameState: GameState, completeReveal: () => void) {
  const [index, setIndex] = useState(-1);
  const [beat, setBeat] = useState<RevealBeat>('waiting');
  const [paused, setPaused] = useState(false);
  const sequenceRef = useRef<Answer[] | null>(null);
  const completedRef = useRef(false);
  const completeRef = useRef(completeReveal);
  completeRef.current = completeReveal;
  const enabled = gameState.status === GameStatus.REVEAL;
  const sequence = sequenceRef.current ?? gameState.answers;

  const advance = () => {
    if (beat === 'waiting') {
      if (!sequence.length) setBeat('question-reading');
      else {
        setIndex(0);
        setBeat('reading');
      }
    } else if (beat === 'reading') setBeat('settling');
    else if (beat === 'settling') {
      if (index + 1 >= sequence.length) setBeat('question-reading');
      else {
        setIndex((value) => value + 1);
        setBeat('reading');
      }
    } else if (beat === 'question-reading') setBeat('question-settling');
    else if (beat === 'question-settling') setBeat('question');
    else if (!completedRef.current) {
      completedRef.current = true;
      completeRef.current();
    }
  };

  useEffect(() => {
    if (!enabled || completedRef.current) return;
    sequenceRef.current ??= gameState.answers;
    // A paused reading stays in the centre. Once collected, always finish the movement.
    if (paused && beat !== 'settling' && beat !== 'question-settling') return;
    const hold =
      beat === 'waiting'
        ? 1200
        : beat === 'reading'
          ? answerHoldMs(sequenceRef.current[index]?.text ?? '')
          : beat === 'settling'
            ? CARD_SETTLE_MS + 250
            : beat === 'question-reading'
              ? QUESTION_HOLD_MS
              : beat === 'question-settling'
                ? QUESTION_SETTLE_MS
                : 900;
    const timer = window.setTimeout(advance, hold);
    return () => window.clearTimeout(timer);
  }, [enabled, gameState.answers, index, beat, paused]);

  const settledCount = beat.startsWith('question')
    ? sequence.length
    : beat === 'settling'
      ? index + 1
      : Math.max(0, index);
  return {
    beat,
    visibleCount: Math.max(0, index + 1),
    activePlayerId: enabled && beat === 'reading' ? sequence[index]?.playerId : undefined,
    settledIds: new Set(sequence.slice(0, settledCount).map((answer) => answer.playerId)),
    paused,
    togglePause: () => setPaused((value) => !value),
    next: () => {
      if (beat !== 'settling' && beat !== 'question-settling') advance();
    },
  };
}
