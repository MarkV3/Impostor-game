import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Player } from '../../types';

interface TableLayoutProps {
    players: Player[];
    children?: React.ReactNode;
    showScores?: boolean;
    scores?: Record<string, number>;
    animateDrumRoll?: boolean;
    highlightImpostor?: string;
    annotations?: Record<string, string>;
    shakeNames?: boolean;
    hud?: React.ReactNode;
    answeredIds?: Set<string>;
    activeRevealPlayerId?: string;
    revealedAnswers?: Record<string, string>;
    ringTopOverlay?: React.ReactNode;
    recentlyRevealedPlayerId?: string;
    overlay?: (info: { seatPositions: Record<string, { left: number; top: number }>; center: { left: number; top: number } }) => React.ReactNode;
}

const TableLayout: React.FC<TableLayoutProps> = ({ players, children, showScores = false, scores = {}, animateDrumRoll = false, highlightImpostor, annotations = {}, shakeNames = false, hud, answeredIds, activeRevealPlayerId, revealedAnswers = {}, ringTopOverlay, recentlyRevealedPlayerId, overlay }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState<{ width: number, height: number }>({ width: 0, height: 0 });
    const [ringRadius, setRingRadius] = useState<number>(0);

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new (window as any).ResizeObserver((entries: any) => {
            const entry = entries[0];
            const cr = entry.contentRect;
            setContainerSize({ width: cr.width, height: cr.height });
        });
        ro.observe(el);
        // Fallback in case ResizeObserver is unavailable
        const updateSize = () => setContainerSize({ width: el.clientWidth, height: el.clientHeight });
        window.addEventListener('resize', updateSize);
        updateSize();
        return () => {
            try { ro.disconnect(); } catch {}
            window.removeEventListener('resize', updateSize);
        };
    }, []);

    useLayoutEffect(() => {
        const el = ringRef.current;
        if (!el) return;
        const ro = new (window as any).ResizeObserver((entries: any) => {
            const rect = entries[0].contentRect;
            setRingRadius(rect.width / 2);
        });
        ro.observe(el);
        const updateRing = () => {
            const rect = el.getBoundingClientRect();
            setRingRadius(rect.width / 2);
        };
        window.addEventListener('resize', updateRing);
        updateRing();
        return () => {
            try { ro.disconnect(); } catch {}
            window.removeEventListener('resize', updateRing);
        };
    }, []);
    const gamePlayers = players.filter(p => !p.isDisplay);
    const numPlayers = gamePlayers.length;

    // Calculate positions for players around the table
    const getPlayerPosition = (index: number) => {
        const angle = (index / numPlayers) * 2 * Math.PI - Math.PI / 2; // Start from top
        const AVATAR_DIAMETER = 80; // Tailwind w-20 -> 80px
        const SEAT_OFFSET = 28; // move seats farther from the table ring
        const radiusFraction = 0.40; // fallback fraction of container if ring not measured yet
        const { width, height } = containerSize;
        if (width === 0 || height === 0 || ringRadius === 0) {
            // Conservative fallback before first layout pass: keep seats near center
            const radiusPercent = 3; // small temporary offset to avoid large jump
            const x = 50 + radiusPercent * Math.cos(angle);
            const y = 50 + radiusPercent * Math.sin(angle);
            return { left: `${x}%`, top: `${y}%` } as const;
        }
        const fallbackR = Math.min(width, height) * radiusFraction;
        const seatCenterRadius = (ringRadius || fallbackR) + SEAT_OFFSET + AVATAR_DIAMETER / 2;
        const cx = width / 2;
        const cy = height / 2;
        const left = cx + seatCenterRadius * Math.cos(angle);
        const top = cy + seatCenterRadius * Math.sin(angle);
        return { left, top } as const;
    };

    return (
        <div ref={containerRef} className="relative w-full h-[calc(100vh-4rem)] bg-gray-900 overflow-hidden">
            {/* Central ring/table styled to match theme */}
            <div ref={ringRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full w-[60vmin] h-[60vmin] min-w-[18rem] min-h-[18rem] max-w-[34rem] max-h-[34rem]">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-700/40 to-purple-700/30 blur-2xl"></div>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/40"></div>
                <div className="absolute inset-8 rounded-full border-2 border-indigo-400/30"></div>
                {ringTopOverlay && (
                    <div className="absolute left-1/2 top-12 -translate-x-1/2 z-10">
                        {ringTopOverlay}
                    </div>
                )}
            </div>

            {/* Overlay positioned relative to the table container with seat positions */}
            {(containerSize.width > 0 && containerSize.height > 0 && ringRadius > 0 && overlay) && (() => {
                const seatPositions: Record<string, { left: number; top: number }> = {};
                gamePlayers.forEach((p, i) => {
                    const pos = getPlayerPosition(i) as any;
                    if (typeof pos.left === 'number' && typeof pos.top === 'number') {
                        seatPositions[p.id] = { left: pos.left, top: pos.top };
                    }
                });
                return (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                        {overlay({ seatPositions, center: { left: containerSize.width / 2, top: containerSize.height / 2 } })}
                    </div>
                );
            })()}

            {/* Players positioned around the table */}
            {(containerSize.width > 0 && containerSize.height > 0 && ringRadius > 0) && gamePlayers.map((player, index) => {
                const position = getPlayerPosition(index);
                const score = scores[player.id] || 0;
                const isImpostor = highlightImpostor === player.id;
                const isCitizen = highlightImpostor && highlightImpostor !== player.id;
                const isAnswered = answeredIds?.has(player.id);
                const centerX = containerSize.width / 2;
                const centerY = containerSize.height / 2;
                const vx = (position as any).left - centerX;
                const vy = (position as any).top - centerY;
                const len = Math.max(1, Math.hypot(vx, vy));
                const ux = vx / len;
                const uy = vy / len;
                const bubbleOffset = Math.min(180, Math.max(110, ringRadius * 0.25));
                const dx = ux * bubbleOffset;
                const dy = uy * bubbleOffset;

                return (
                    <div
                        key={player.id}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${
                            animateDrumRoll ? 'animate-bounce' : ''
                        }`}
                        style={{ left: (position as any).left, top: (position as any).top }}
                    >
                        {/* Revealed answer bubble placed radially away from the table */}
                        {revealedAnswers[player.id] && (
                            <div
                                className="absolute left-1/2 top-1/2"
                                style={{ transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)` }}
                            >
                                <div className={`max-w-[22rem] text-sm text-gray-100 bg-gray-800/95 border rounded-xl px-3 py-2 shadow-2xl transition-all duration-500 ${
                                    recentlyRevealedPlayerId === player.id ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-105' : 'border-gray-600'
                                }`}>
                                    {revealedAnswers[player.id]}
                                </div>
                            </div>
                        )}

                        {/* Keep the outer box centered strictly by the avatar's fixed size */}
                        <div className="relative w-20 h-20">
                            {/* Player avatar/seat */}
                            <div className={`w-20 h-20 rounded-full border-4 shadow-lg flex items-center justify-center ${
                                isImpostor ? 'bg-gradient-to-br from-red-500 to-red-700 border-red-400 animate-pulse' :
                                isCitizen ? 'bg-gradient-to-br from-green-500 to-green-700 border-green-400' :
                                isAnswered ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-emerald-400 ring-4 ring-emerald-400/30' :
                                'bg-gradient-to-br from-indigo-500 to-purple-600 border-gray-700'
                            }`}>
                                <span className="text-white font-bold text-lg">
                                    {player.name.charAt(0).toUpperCase()}
                                </span>
                            </div>

                            {/* Labels positioned absolutely below so they don't affect centering */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+0.5rem)] text-center">
                                <div className={`font-bold text-sm px-3 py-1 rounded-lg shadow-md ${
                                    isImpostor ? 'text-red-300 bg-red-900 border border-red-500' :
                                    isCitizen ? 'text-green-300 bg-green-900 border border-green-500' :
                                    'text-white bg-gray-800'
                                } ${shakeNames ? 'animate-pulse' : ''} ${isAnswered ? 'ring-2 ring-emerald-400/60 bg-gradient-to-r from-emerald-300/10 via-white/10 to-emerald-300/10 bg-[length:200%_100%] animate-shine-once' : ''}`}>
                                    {player.name}
                                </div>
                                {showScores && (
                                    <div className={`font-bold text-xs mt-1 ${
                                        isImpostor ? 'text-red-400' :
                                        isCitizen ? 'text-green-400' :
                                        'text-indigo-300'
                                    }`}>
                                        {score} pts
                                    </div>
                                )}
                                {annotations[player.id] && (
                                    <div className="mt-2 max-w-[14rem] text-xs text-gray-200 bg-gray-800/80 border border-gray-600 rounded-md px-2 py-1 flex items-center gap-1">
                                        <span>{isAnswered ? '✅' : '🧠'}</span>
                                        <span>{annotations[player.id]}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* HUD area for timers/round labels etc. */}
            {hud}

            {/* Central content */}
            {children && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                    {children}
                </div>
            )}
        </div>
    );
};

export default TableLayout;
