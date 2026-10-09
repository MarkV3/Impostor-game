import React, { useLayoutEffect, useRef } from 'react';

// Keep the shared round inside the screen, including its footer and controls.
const DisplayFit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const scene = sceneRef.current;
    if (!frame || !scene) return;
    const fit = () => {
      if (window.innerWidth <= 700) {
        scene.style.removeProperty('--scene-scale');
        return;
      }
      const scale = Math.min(
        1,
        Math.max(1, frame.clientHeight - 24) / Math.max(1, scene.offsetHeight),
      );
      scene.style.setProperty('--scene-scale', String(scale));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    observer.observe(scene);
    window.addEventListener('resize', fit);
    fit();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, []);
  return (
    <div className="display-fit" ref={frameRef}>
      <div className="display-fit-scene" ref={sceneRef}>
        {children}
      </div>
    </div>
  );
};
export default DisplayFit;
