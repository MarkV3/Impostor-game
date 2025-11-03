import React, { useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';

const DisplayGameOver: React.FC = () => {
    const { gameState } = useContext(GameContext);
    if (!gameState) return null;

    const { players, leaderboard } = gameState;

    const sortedPlayers = Object.entries(leaderboard)
        // Fix: Simplified the sort function to avoid potential type inference issues with arithmetic operations.
        .sort((a, b) => b[1] - a[1])
        .map(([playerId, score]) => ({
            player: players.find(p => p.id === playerId),
            score,
        }))
        .filter(p => p.player && !p.player.isDisplay);
    
    const winner = sortedPlayers[0];

    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-center">
            <h1 className="text-7xl font-extrabold text-indigo-400 mb-8">Game Over!</h1>
            
            {winner && (
                <div className="mb-12">
                    <p className="text-3xl text-gray-300">Winner is</p>
                    <p className="text-6xl font-bold text-yellow-400">{winner.player?.name}</p>
                    <p className="text-4xl text-gray-300">with {winner.score} points!</p>
                </div>
            )}

            <div className="w-full max-w-md bg-gray-800 p-6 rounded-2xl">
                <h2 className="text-3xl font-bold mb-4">Final Scores</h2>
                <div className="space-y-2">
                    {sortedPlayers.map(({ player, score }, index) => (
                        <div key={player?.id} className="flex justify-between items-center text-xl p-3 bg-gray-700 rounded-lg">
                            <span>{index + 1}. {player?.name}</span>
                            <span className="font-bold">{score}</span>
                        </div>
                    ))}
                </div>
            </div>
             <p className="mt-8 text-gray-500">Refresh to play again.</p>
        </div>
    );
};

export default DisplayGameOver;