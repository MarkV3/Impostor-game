import React, { useLayoutEffect, useRef } from 'react';
import { QUESTION_SETTLE_MS } from './useAnswerReveal';

const OriginalQuestion: React.FC<{ text: string; focused: boolean }> = ({ text, focused }) => {
  const questionRef = useRef<HTMLDivElement>(null);
  const wasFocused = useRef(false);
  const centreRect = useRef<DOMRect | null>(null);
  useLayoutEffect(() => {
    const question = questionRef.current;
    const anchor = question?.parentElement;
    const scene = question?.closest<HTMLElement>('.reveal-scene');
    if (!question || !anchor || !scene) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (focused) {
      const update = () => {
        const bounds = scene.getBoundingClientRect();
        const origin = anchor.getBoundingClientRect();
        const scale = bounds.width / scene.offsetWidth;
        question.style.setProperty(
          '--question-x',
          `${scene.clientWidth / 2 - (origin.x - bounds.x) / scale}px`,
        );
        question.style.setProperty(
          '--question-y',
          `${scene.clientHeight / 2 - (origin.y - bounds.y) / scale}px`,
        );
        centreRect.current = question.getBoundingClientRect();
      };
      update();
      wasFocused.current = true;
      window.addEventListener('resize', update);
      const animation = reduced
        ? undefined
        : question.animate(
            [
              { opacity: 0, transform: 'translate(-50%, calc(-50% + 18px)) scale(.96)' },
              { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
            ],
            { duration: 800, easing: 'cubic-bezier(.2,.7,.2,1)' },
          );
      if (animation)
        animation.onfinish = () => {
          centreRect.current = question.getBoundingClientRect();
        };
      return () => {
        animation?.cancel();
        window.removeEventListener('resize', update);
      };
    }
    if (wasFocused.current && centreRect.current) {
      wasFocused.current = false;
      const from = centreRect.current;
      const to = question.getBoundingClientRect();
      const scale = scene.getBoundingClientRect().width / scene.offsetWidth;
      const animation = reduced
        ? undefined
        : question.animate(
            [
              {
                transform: `translate(${(from.x - to.x) / scale}px, ${(from.y - to.y) / scale}px) scale(${from.width / to.width}, ${from.height / to.height})`,
              },
              { transform: 'translate(0,0) scale(1,1)' },
            ],
            { duration: QUESTION_SETTLE_MS, easing: 'cubic-bezier(.22,.7,.22,1)' },
          );
      return () => animation?.cancel();
    }
  }, [focused]);
  return (
    <div ref={questionRef} className={`original-question ${focused ? 'is-focused' : ''}`}>
      <p className="eyebrow">The original question</p>
      <h1>{text}</h1>
    </div>
  );
};
export default OriginalQuestion;
