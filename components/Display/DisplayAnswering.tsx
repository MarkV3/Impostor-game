
import React, { useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import CountdownTimer from '../shared/CountdownTimer';

const DisplayAnswering: React.FC = () => {
    const { gameState } = useContext(GameContext);
    if (!gameState || !gameState.answeringEndsAt) return null;

    const { players, answers, currentRound, totalRounds } = gameState;
    const gamePlayers = players.filter(p => !p.isDisplay);
    const answeredPlayerIds = new Set(answers.map(a => a.playerId));

    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-center">
            <div className="absolute top-8 right-8 flex items-center gap-4">
                <span className="text-2xl font-bold">Round {currentRound}/{totalRounds}</span>
                <CountdownTimer endsAt={gameState.answeringEndsAt} totalDuration={60 * 1000} size={80} strokeWidth={8} />
            </div>

            <h1 className="text-6xl font-extrabold mb-12">Who's the Impostor?</h1>
            <p className="text-3xl text-gray-300 mb-12">A prompt has been sent. Submit your answers now!</p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 w-full max-w-6xl">
                {gamePlayers.map(player => (
                    <div
                        key={player.id}
                        className={`p-6 rounded-xl shadow-lg transition-all duration-300 ${
                            answeredPlayerIds.has(player.id)
                                ? 'bg-green-600'
                                : 'bg-gray-700'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-3">
                             {answeredPlayerIds.has(player.id) && (
                                <CheckCircleIcon className="h-8 w-8 text-white" />
                            )}
                            <span className="text-2xl font-bold truncate">{player.name}</span>
                        </div>
                        <p className="text-lg mt-1 text-gray-200">{answeredPlayerIds.has(player.id) ? 'Answered' : 'Thinking...'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DisplayAnswering;
