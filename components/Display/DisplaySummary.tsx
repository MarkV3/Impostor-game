import React, { useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';
import { UserIcon } from '@heroicons/react/24/solid';

const DisplaySummary: React.FC = () => {
    const { gameState } = useContext(GameContext);
    if (!gameState) return null;

    const { players, impostorId, votes, pointsThisRound, leaderboard, currentRound, totalRounds, summaryEndsAt } = gameState;
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
        <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] gap-8">
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-800 p-8 rounded-2xl">
                <h1 className="text-3xl font-bold mb-4">Round {currentRound} Results</h1>
                <div className="text-center bg-red-800 p-6 rounded-lg mb-8 w-full max-w-md">
                    <p className="text-xl text-red-200">The Impostor was</p>
                    <p className="text-5xl font-extrabold text-white">{impostor?.name}</p>
                </div>
                
                <div className="w-full max-w-4xl grid grid-cols-2 gap-6">
                    {players.filter(p => !p.isDisplay).map(player => (
                        <div key={player.id} className={`p-4 rounded-lg ${player.id === impostorId ? 'bg-red-900 border-2 border-red-500' : 'bg-gray-700'}`}>
                            <div className="flex justify-between items-center">
                                <span className="text-2xl font-bold">{player.name}</span>
                                <span className={`text-2xl font-bold ${pointsThisRound?.[player.id] ?? 0 > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                    +{pointsThisRound?.[player.id] ?? 0}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                {votesByTarget[player.id]?.length > 0 ? (
                                    votesByTarget[player.id].map(voterId => (
                                        <div key={voterId} className="bg-gray-600 px-3 py-1 rounded-full text-sm flex items-center gap-1" title={`Voted by ${getPlayerName(voterId)}`}>
                                            <UserIcon className="h-4 w-4" />
                                            {getPlayerName(voterId)}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400 text-sm">No votes received</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                {summaryEndsAt && (
                  <div className="w-full max-w-4xl mt-8">
                     <p className="text-center text-gray-400">Next round starts soon...</p>
                  </div>
                )}
            </div>

            <div className="w-full md:w-96 flex flex-col bg-gray-800 p-8 rounded-2xl">
                <h2 className="text-3xl font-bold mb-6">Leaderboard</h2>
                <div className="space-y-3">
                    {Object.entries(leaderboard)
                        // Fix: Simplified the sort function to avoid potential type inference issues with arithmetic operations.
                        .sort((a, b) => b[1] - a[1])
                        .map(([playerId, score], index) => {
                            const player = players.find(p => p.id === playerId);
                            if (!player || player.isDisplay) return null;
                            return (
                                <div key={playerId} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                                    <span className="text-xl font-medium">{index + 1}. {player.name}</span>
                                    <span className="text-2xl font-bold text-indigo-400">{score}</span>
                                </div>
                            );
                    })}
                </div>
            </div>
        </div>
    );
};

export default DisplaySummary;