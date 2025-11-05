import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../../contexts/GameContext';
import TableLayout from './TableLayout';
import { UserIcon } from '@heroicons/react/24/solid';

const DisplaySummary: React.FC = () => {
    const { gameState } = useContext(GameContext);
    const [showResults, setShowResults] = useState(false);
    const [countdown, setCountdown] = useState(3);

    if (!gameState) return null;

    const { players, impostorId, votes, pointsThisRound, leaderboard, currentRound, totalRounds, summaryEndsAt } = gameState;

    useEffect(() => {
        // Show a short countdown, then reveal results
        const t = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(t);
                    setShowResults(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, []);
    const impostor = players.find(p => p.id === impostorId);

    const votesByTarget: Record<string, string[]> = players.reduce((acc, player) => {
        acc[player.id] = [];
        return acc;
    }, {} as Record<string, string[]>);

    votes.forEach(vote => {
        if(votesByTarget[vote.targetId]) {
            votesByTarget[vote.targetId].push(vote.voterId);
        }
    });

    const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

    return (
        <TableLayout
            players={players}
            showScores={true}
            scores={leaderboard}
            shakeNames={!showResults}
            highlightImpostor={showResults ? impostorId : undefined}
            hud={(
                <div className="absolute top-6 left-6 z-20 text-sm px-3 py-2 rounded-md bg-white/10 backdrop-blur-md border border-white/20">
                    <span className="font-semibold">Round {currentRound}/{totalRounds}</span>
                </div>
            )}
        >
            <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-5xl">
                

                {!showResults ? (
                    <div className="text-center">
                        <h1 className="text-5xl font-bold mb-4 text-white">All votes are in!</h1>
                        <p className="text-2xl text-gray-300 mb-2">Revealing in...</p>
                        <div className="text-7xl font-extrabold text-indigo-400 animate-pulse-fast">{countdown}</div>
                    </div>
                ) : (
                    <>
                        <h1 className="text-4xl font-bold mb-6 text-white">Round {currentRound} Results</h1>
                        <div className="text-center bg-red-800/80 p-6 rounded-lg mb-8 w-full max-w-md mx-auto">
                            <p className="text-xl text-red-200">The Impostor was</p>
                            <p className="text-4xl font-extrabold text-white">{impostor?.name}</p>
                        </div>
                    </>
                )}

                {showResults && (
                    <>
                        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {players.filter(p => !p.isDisplay).map(player => (
                        <div key={player.id} className={`p-4 rounded-lg ${player.id === impostorId ? 'bg-red-900 border-2 border-red-500' : 'bg-gray-700'}`}>
                            <div className="flex justify-between items-center">
                                <span className="text-xl font-bold text-white">{player.name}</span>
                                <span className={`text-xl font-bold ${pointsThisRound?.[player.id] ?? 0 > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                    +{pointsThisRound?.[player.id] ?? 0}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                                {votesByTarget[player.id]?.length > 0 ? (
                                    votesByTarget[player.id].map(voterId => (
                                        <div key={voterId} className="bg-gray-600 px-2 py-1 rounded-full text-xs flex items-center gap-1" title={`Voted by ${getPlayerName(voterId)}`}>
                                            <UserIcon className="h-3 w-3" />
                                            {getPlayerName(voterId)}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400 text-xs">No votes received</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8">
                    <h2 className="text-2xl font-bold mb-4 text-white">Leaderboard</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(leaderboard)
                            .sort((a, b) => b[1] - a[1])
                            .map(([playerId, score], index) => {
                                const player = players.find(p => p.id === playerId);
                                if (!player || player.isDisplay) return null;
                                return (
                                    <div key={playerId} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                                        <span className="text-lg font-medium text-white">{index + 1}. {player.name}</span>
                                        <span className="text-xl font-bold text-indigo-400">{score}</span>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                        {summaryEndsAt && (
                            <div className="mt-6">
                                <p className="text-center text-gray-400">Next round starts soon...</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </TableLayout>
    );
};

export default DisplaySummary;