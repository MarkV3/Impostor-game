
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { GameContext } from '../../contexts/GameContext';
import TableLayout from './TableLayout';
import { GameStatus } from '../../types';

const DisplayDiscussVote: React.FC = () => {
    const { gameState } = useContext(GameContext);
    if (!gameState || gameState.status !== GameStatus.DISCUSS_AND_VOTE) return null;

    const { players, currentRound, totalRounds, votes, leaderboard, mainQuestion, answers } = gameState;
    const gamePlayers = players.filter(p => !p.isDisplay);
    const votedPlayerIds = new Set(votes.map(v => v.voterId));
    const allVoted = votedPlayerIds.size >= gamePlayers.length;
    const progress = gamePlayers.length > 0 ? (votedPlayerIds.size / gamePlayers.length) * 100 : 0;

    const [entered, setEntered] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const revealedAnswers = useMemo(() => {
        const map: Record<string, string> = {};
        for (const answer of answers) {
            if (answer?.playerId) {
                const text = typeof answer.text === 'string' ? answer.text.trim() : '';
                if (text) map[answer.playerId] = text;
            }
        }
        return map;
    }, [answers]);

    return (
        <TableLayout
            players={players}
            showScores={true}
            scores={leaderboard}
            revealedAnswers={revealedAnswers}
            hud={(
                <>
                    <div className="absolute top-6 left-6 z-20 text-sm px-3 py-2 rounded-md bg-white/10 backdrop-blur-md border border-white/20">
                        <span className="font-semibold">Round {currentRound}/{totalRounds}</span>
                    </div>
                </>
            )}
        >
            <div className="relative flex flex-col items-center gap-8 w-[min(90vw,32rem)] pointer-events-none">
                {mainQuestion && (
                    <div
                        className={`w-full rounded-2xl bg-white/10 backdrop-blur-lg shadow-2xl border border-white/15 px-6 py-5 text-center text-white transition-all duration-[1600ms] ease-out ${entered ? '-translate-y-12 scale-95 opacity-95' : 'translate-y-2 scale-100 opacity-100'
                            }`}
                    >
                        <div className="text-sm uppercase tracking-[0.35em] text-indigo-200/90 mb-2">The real question</div>
                        <div className="text-3xl font-extrabold leading-snug">“{mainQuestion}”</div>
                        <p className="mt-2 text-sm text-indigo-100/80">Keep it in mind while you debate.</p>
                    </div>
                )}

                <div
                    className={`w-full rounded-2xl bg-indigo-900/40 border border-indigo-500/30 backdrop-blur-lg shadow-xl px-6 py-7 text-center text-white transition-all duration-[1400ms] ease-out ${entered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
                        }`}
                    style={{ pointerEvents: 'auto' }}
                >
                    <h1 className="text-3xl font-extrabold mb-2">Discuss & Vote</h1>
                    <p className="text-base text-indigo-100/80 mb-6">Who is the impostor? Cast your vote on your device.</p>

                    <div className="space-y-3">
                        <div className="text-sm font-semibold text-indigo-100/90">
                            {votedPlayerIds.size} of {gamePlayers.length} players have voted
                        </div>
                        <div className="w-full bg-indigo-950/60 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${allVoted ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>

                    {allVoted && (
                        <div className="mt-4 text-emerald-300 text-base font-semibold animate-pulse">
                            All votes received! Finalizing results...
                        </div>
                    )}
                </div>
            </div>
        </TableLayout>
    );
};

export default DisplayDiscussVote;
