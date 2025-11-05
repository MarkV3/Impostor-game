import React, { useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';
import TableLayout from './TableLayout';
import Button from '../shared/Button';

const DisplayGameOver: React.FC = () => {
    const { gameState, actions } = useContext(GameContext);
    if (!gameState) return null;

    const { players, leaderboard } = gameState;

    const sortedPlayers = Object.entries(leaderboard)
        .sort((a, b) => b[1] - a[1])
        .map(([playerId, score]) => ({
            player: players.find(p => p.id === playerId),
            score,
        }))
        .filter(p => p.player && !p.player.isDisplay);

    const winner = sortedPlayers[0];
    const second = sortedPlayers[1];
    const third = sortedPlayers[2];

    return (
        <TableLayout players={players} showScores={true} scores={leaderboard}>
            <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-3xl">
                <div className="text-5xl mb-3 animate-bounce">🎉</div>
                <h1 className="text-4xl font-extrabold text-indigo-300 mb-6">Game Over</h1>

                {winner && (
                    <div className="mb-6">
                        <p className="text-lg text-gray-300">Winner</p>
                        <p className="text-4xl font-bold bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                            {winner.player?.name}
                        </p>
                        <p className="text-xl text-gray-300">{winner.score} pts</p>
                    </div>
                )}

                <div className="w-full">
                    <h2 className="text-2xl font-bold mb-4 text-white">Leaderboard</h2>
                    <div className="divide-y divide-gray-700 rounded-lg overflow-hidden bg-gray-700/40">
                        {sortedPlayers.map(({ player, score }, index) => (
                            <div key={player?.id} className="flex items-center justify-between px-4 py-3">
                                <span className="text-white font-medium">{index + 1}. {player?.name}</span>
                                <span className="text-indigo-300 font-bold">{score}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8">
                    <Button onClick={actions.restartGame} className="text-lg px-6 py-3">
                        🔄 Restart Game
                    </Button>
                </div>
            </div>
        </TableLayout>
    );
};

export default DisplayGameOver;