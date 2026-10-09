import React, { useLayoutEffect, useRef } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import type { Player } from '../../../shared/types';
import PlayerAvatar from '../ui/PlayerAvatar';
import { ThinkingDots } from './TableLayout';
import { CARD_SETTLE_MS } from './useAnswerReveal';

const AnswerCard: React.FC<{
  player: Player;
  index: number;
  text: string;
  active: boolean;
  visible: boolean;
  voting: boolean;
  voted: boolean;
  impostor: boolean;
  suspense: boolean;
  voters?: string[];
  score?: number;
  gain?: number;
  rank?: number;
}> = ({
  player,
  index,
  text,
  active,
  visible,
  voting,
  voted,
  impostor,
  suspense,
  voters,
  score,
  gain,
  rank,
}) => {
  const slotRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const wasActive = useRef(false);
  const centreRect = useRef<DOMRect | null>(null);
  const voterTextRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const textElement = voterTextRef.current;
    const body = textElement?.closest<HTMLElement>('.card-body');
    const answer = body?.querySelector('blockquote');
    if (!textElement || !body || !answer) return;
    const fit = () => {
      let size = parseFloat(getComputedStyle(answer).fontSize);
      textElement.style.fontSize = `${size}px`;
      while (size > 8 && textElement.scrollHeight > textElement.clientHeight + 1) {
        size -= 0.5;
        textElement.style.fontSize = `${size}px`;
      }
    };
    const observer = new ResizeObserver(fit);
    observer.observe(body);
    window.addEventListener('resize', fit);
    fit();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [voters]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (active) {
      const update = () => {
        const slot = slotRef.current;
        const theatre = slot?.closest<HTMLElement>('.answer-theatre');
        if (!slot || !theatre) return;
        const theatreBounds = theatre.getBoundingClientRect();
        const slotBounds = slot.getBoundingClientRect();
        const scale = theatreBounds.width / theatre.offsetWidth;
        card.style.setProperty(
          '--spot-x',
          `${theatre.clientWidth / 2 - (slotBounds.x - theatreBounds.x) / scale}px`,
        );
        card.style.setProperty(
          '--spot-y',
          `${Math.min(250, theatre.clientHeight / 2) - (slotBounds.y - theatreBounds.y) / scale}px`,
        );
        centreRect.current = card.getBoundingClientRect();
      };
      update();
      window.addEventListener('resize', update);
      wasActive.current = true;
      const animation = reduced
        ? undefined
        : card.animate(
            [
              { opacity: 0, transform: 'translate(-50%, calc(-50% + 22px)) rotate(-2deg)' },
              { opacity: 1, transform: 'translate(-50%, -50%) rotate(0deg)' },
            ],
            { duration: 700, easing: 'cubic-bezier(.2,.7,.2,1)' },
          );
      if (animation)
        animation.onfinish = () => {
          centreRect.current = card.getBoundingClientRect();
        };
      return () => {
        animation?.cancel();
        window.removeEventListener('resize', update);
      };
    }
    if (wasActive.current && centreRect.current) {
      wasActive.current = false;
      const from = centreRect.current;
      const to = card.getBoundingClientRect();
      const theatre = card.closest<HTMLElement>('.answer-theatre')!;
      const scale = theatre.getBoundingClientRect().width / theatre.offsetWidth;
      if (!reduced && to.width && to.height) {
        card.style.zIndex = '12';
        const animation = card.animate(
          [
            {
              transform: `translate(${(from.x - to.x) / scale}px, ${(from.y - to.y) / scale}px) scale(${from.width / to.width}, ${from.height / to.height})`,
            },
            { transform: 'translate(0, 0) scale(1, 1)' },
          ],
          { duration: CARD_SETTLE_MS, easing: 'cubic-bezier(.22,.7,.22,1)' },
        );
        animation.onfinish = () => {
          card.style.zIndex = '';
        };
        return () => {
          animation.cancel();
          card.style.zIndex = '';
        };
      }
    }
  }, [active]);

  return (
    <div
      ref={slotRef}
      className={`answer-slot ${visible ? 'is-filled' : ''} ${active ? 'has-spotlight' : ''}`}
    >
      <div className="answer-placeholder" aria-hidden="true">
        <span>{String(index + 1).padStart(2, '0')}</span>
      </div>
      <article
        ref={cardRef}
        data-player-id={player.id}
        className={`evidence-card player-card ${visible ? 'is-open' : 'is-hidden'} ${active ? 'is-reading' : ''} ${voting ? (voted ? 'is-voted' : 'is-choosing') : ''} ${impostor ? 'is-impostor' : ''} ${suspense ? 'awaiting-verdict' : ''}`}
      >
        {impostor && <span className="impostor-flag">Impostor</span>}
        <header>
          <PlayerAvatar name={player.name} index={index} />
          <h2>{player.name}</h2>
          <span className="card-number">{String(index + 1).padStart(2, '0')}</span>
        </header>
        <div className="card-body">
          <blockquote
            aria-hidden={voters !== undefined}
            style={{ visibility: voters !== undefined ? 'hidden' : undefined }}
            className={text.length > 50 ? 'long-card-answer' : ''}
          >
            {text}
          </blockquote>
          {voters !== undefined && (
            <div className="card-voters">
              <span>Voted for {player.name}</span>
              <p ref={voterTextRef}>{voters.length ? voters.join(', ') : 'Nobody'}</p>
            </div>
          )}
        </div>
        <footer>
          {score !== undefined ? (
            <>
              <span className="card-placement">
                {rank !== undefined ? `#${rank} overall` : 'Total points'}
              </span>
              <span className="card-points">
                <strong>{score}</strong> pts <em>+{gain ?? 0}</em>
              </span>
            </>
          ) : voting ? (
            <span className={`card-vote-status ${voted ? 'has-voted' : ''}`}>
              {voted ? <CheckIcon /> : <ThinkingDots />}
              {voted ? 'Vote in' : 'Choosing on their phone'}
            </span>
          ) : (
            <span>
              {voters !== undefined
                ? 'The votes are in.'
                : active
                  ? 'Take it in. Any questions?'
                  : 'Keep this one in mind.'}
            </span>
          )}
        </footer>
      </article>
    </div>
  );
};
export default AnswerCard;
