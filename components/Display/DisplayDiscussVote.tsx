
import React, { useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';
import CountdownTimer from '../shared/CountdownTimer';
import TableLayout from './TableLayout';
import { GameStatus } from '../../types';

const DisplayDiscussVote: React.FC = () => {
    const { gameState } = useContext(GameContext);
    if (!gameState || !gameState.votingEndsAt || gameState.status !== GameStatus.DISCUSS_AND_VOTE) return null;

    const { players, currentRound, totalRounds, votes, leaderboard, mainQuestion } = gameState;
    const gamePlayers = players.filter(p => !p.isDisplay);
    const votedPlayerIds = new Set(votes.map(v => v.voterId));
    const allVoted = votedPlayerIds.size >= gamePlayers.length;

    return (
        <TableLayout
            players={players}
            showScores={true}
            scores={leaderboard}
            hud={(
                <>
                    <div className="absolute top-6 left-6 z-20 text-sm px-3 py-2 rounded-md bg-white/10 backdrop-blur-md border border-white/20">
                        <span className="font-semibold">Round {currentRound}/{totalRounds}</span>
                    </div>
                    <div className="absolute top-6 right-6 z-20">
                        <CountdownTimer endsAt={gameState.votingEndsAt} totalDuration={(gameState.config?.votingSeconds ?? 90) * 1000} size={76} strokeWidth={8} />
                    </div>
                </>
            )}
        >
            <div className="text-center bg-white/10 backdrop-blur-md p-6 rounded-xl shadow-xl max-w-xl">

                <h1 className="text-3xl font-extrabold mb-1 text-white">Discuss & Vote</h1>
                <p className="text-base text-gray-300 mb-4">Who is the impostor? Vote on your phone!</p>

                {mainQuestion && (
                    <div className="mb-5 p-3 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-100">
                        <div className="text-xs uppercase tracking-widest opacity-75">The real question</div>
                        <div className="text-xl font-semibold mt-0.5">“{mainQuestion}”</div>
                    </div>
                )}

                <div className="mt-6">
                    <h2 className="text-sm mb-2 text-gray-200 font-medium">{votedPlayerIds.size} of {gamePlayers.length} players have voted</h2>
                    <div className="w-full bg-gray-700/80 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all duration-500 ${allVoted ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${(votedPlayerIds.size / gamePlayers.length) * 100}%` }}>
                        </div>
                    </div>
                </div>

                {allVoted && (
                    <div className="mt-4 text-emerald-300 text-base font-semibold animate-pulse">
                        All votes received! Finalizing results...
                    </div>
                )}
            </div>
        </TableLayout>
    );
};

export default DisplayDiscussVote;
