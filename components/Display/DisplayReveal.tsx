
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { GameContext } from '../../contexts/GameContext';
import TableLayout from './TableLayout';
import Spinner from '../shared/Spinner';

const DisplayReveal: React.FC = () => {
    const { gameState, actions } = useContext(GameContext);
    const [stage, setStage] = useState<'announce' | 'answers' | 'question'>('announce');
    const [activeRevealPlayerId, setActiveRevealPlayerId] = useState<string | null>(null);
    const [typedText, setTypedText] = useState<string>('');
    const [revealedAnswers, setRevealedAnswers] = useState<Record<string, string>>({});
    const [recentlyRevealedPlayerId, setRecentlyRevealedPlayerId] = useState<string | null>(null);
    const [isFlying, setIsFlying] = useState(false);
    const [flyingToPlayerId, setFlyingToPlayerId] = useState<string | null>(null);
    const flyTimeoutRef = useRef<number | null>(null);

    if (!gameState) return null;

    const { mainQuestion, currentRound, totalRounds, players, leaderboard, answers } = gameState;

    const gamePlayers = useMemo(() => players.filter(p => !p.isDisplay), [players]);
    const answersByPlayerId = useMemo(() => {
        const m: Record<string, string> = {};
        for (const a of answers) m[a.playerId] = a.text;
        return m;
    }, [answers]);
    const sequencePlayerIds = useMemo(() => {
        const order: string[] = [];
        for (const a of answers) {
            if (a && a.playerId && !order.includes(a.playerId)) order.push(a.playerId);
        }
        return order.filter(id => Object.prototype.hasOwnProperty.call(answersByPlayerId, id));
    }, [answers, answersByPlayerId]);

    useEffect(() => {
        // Reset state on round change
        setStage('announce');
        setActiveRevealPlayerId(null);
        setTypedText('');
        setRevealedAnswers({});
        setRecentlyRevealedPlayerId(null);
    }, [gameState?.currentRound]);

    useEffect(() => {
        if (stage !== 'announce') return;
        // Keep the "Answered" indicators visible a bit longer before starting the sequence
        const t = setTimeout(() => setStage('answers'), 2000);
        return () => clearTimeout(t);
    }, [stage]);

    useEffect(() => {
        if (stage !== 'answers') return;
        let cancelled = false;
        let timers: number[] = [];

        const runSequence = (idx: number) => {
            if (cancelled) return;
            if (idx >= sequencePlayerIds.length) {
                setStage('question');
                return;
            }
            const playerId = sequencePlayerIds[idx];
            const raw = answersByPlayerId[playerId];
            const fullText = (typeof raw === 'string' ? raw : '').trim();
            setActiveRevealPlayerId(playerId);
            setTypedText('');

            const textToType = fullText;
            let c = 0;
            const interval = window.setInterval(() => {
                if (cancelled) {
                    window.clearInterval(interval);
                    return;
                }
                if (c < textToType.length) {
                    setTypedText(textToType.slice(0, c + 1));
                    c++;
                } else {
                    window.clearInterval(interval);
                    // Hold the completed answer on screen longer, then fly to seat and reveal
                    const pause = window.setTimeout(() => {
                        if (cancelled) return;
                        setIsFlying(true);
                        setFlyingToPlayerId(playerId);
                        const flyDuration = 900;
                        const afterFly = window.setTimeout(() => {
                            if (cancelled) return;
                            setRevealedAnswers(prev => ({ ...prev, [playerId]: fullText }));
                            setRecentlyRevealedPlayerId(playerId);
                            const clearPulse = window.setTimeout(() => setRecentlyRevealedPlayerId(null), 900);
                            timers.push(clearPulse);
                            setIsFlying(false);
                            setFlyingToPlayerId(null);
                            setActiveRevealPlayerId(null);
                            setTypedText('');
                            const gap = window.setTimeout(() => runSequence(idx + 1), 800);
                            timers.push(gap);
                        }, flyDuration);
                        timers.push(afterFly);
                    }, 2400);
                    timers.push(pause);
                }
            }, 60);
            timers.push(interval);
        };

        runSequence(0);
        return () => {
            cancelled = true;
            timers.forEach(id => window.clearTimeout(id));
        };
    }, [stage, sequencePlayerIds, answersByPlayerId]);

    useEffect(() => {
        if (stage !== 'question') return;
        const t = window.setTimeout(() => {
            actions.completeReveal();
        }, 2000);
        return () => window.clearTimeout(t);
    }, [stage, actions]);

    const answeredIdsSet = useMemo(() => new Set(answers.map(a => a.playerId)), [answers]);
    const announceAnnotations = useMemo(() => {
        const m: Record<string, string> = {};
        for (const p of gamePlayers) {
            if (answeredIdsSet.has(p.id)) m[p.id] = 'Answered';
        }
        return m;
    }, [gamePlayers, answeredIdsSet]);

    return (
        <TableLayout
            players={players}
            showScores={true}
            scores={leaderboard}
            activeRevealPlayerId={undefined}
            revealedAnswers={revealedAnswers}
            recentlyRevealedPlayerId={recentlyRevealedPlayerId || undefined}
            answeredIds={stage === 'announce' ? answeredIdsSet : undefined}
            annotations={stage === 'announce' ? announceAnnotations : {}}
            ringTopOverlay={(stage === 'answers' && activeRevealPlayerId) ? (
                <div className="px-4 py-2 rounded-lg bg-black/40 border border-white/20 shadow-lg">
                    <span className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">
                        {gamePlayers.find(p => p.id === activeRevealPlayerId)?.name ?? ''}:
                    </span>
                </div>
            ) : undefined}
            overlay={({ seatPositions, center }) => (
                stage === 'answers' ? (
                    <div
                        className="absolute"
                        style={{ left: center.left, top: center.top }}
                    >
                        <div
                            className="rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl px-6 py-4 text-center text-white"
                            style={{
                                transform: `translate(-50%, -50%) ${isFlying && flyingToPlayerId && seatPositions[flyingToPlayerId] ? `translate(${seatPositions[flyingToPlayerId].left - center.left}px, ${seatPositions[flyingToPlayerId].top - center.top}px) scale(0.7)` : ''}`,
                                transition: 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
                                minWidth: '22rem',
                                maxWidth: '42rem'
                            }}
                        >
                            <div className="text-3xl font-extrabold tracking-wide min-h-[3rem]">
                                {typedText || '…'}
                            </div>
                        </div>
                    </div>
                ) : null
            )}
            hud={(
                <div className="absolute top-6 left-6 z-20 text-sm px-3 py-2 rounded-md bg-white/10 backdrop-blur-md border border-white/20">
                    <span className="font-semibold">Round {currentRound}/{totalRounds}</span>
                </div>
            )}
        >
            {stage === 'announce' && (
                <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-4xl">
                    <div className="flex items-center justify-center gap-3 text-white">
                        <p className="text-3xl font-bold">All answers received!</p>
                        <Spinner />
                    </div>
                </div>
            )}
            {stage === 'answers' && null}
            {stage === 'question' && (
                <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-4xl">
                    <h2 className="text-2xl text-gray-300 mb-3">The real question was</h2>
                    <h1 className="text-4xl font-extrabold p-4 rounded-xl mb-2 shadow-lg text-white bg-indigo-600/80">
                        “{mainQuestion}”
                    </h1>
                    <p className="text-gray-300">Get ready to discuss & vote…</p>
                </div>
            )}
        </TableLayout>
    );
};

export default DisplayReveal;
