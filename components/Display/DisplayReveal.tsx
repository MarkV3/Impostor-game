
import React, { useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';
import Spinner from '../shared/Spinner';

const DisplayReveal: React.FC = () => {
    const { gameState } = useContext(GameContext);
    if (!gameState) return null;

    const { mainQuestion, answers, currentRound, totalRounds } = gameState;

    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-center animate-fade-in">
             <div className="absolute top-8 right-8">
                <span className="text-2xl font-bold">Round {currentRound}/{totalRounds}</span>
            </div>

            <div className="w-full max-w-5xl mx-auto">
                <h2 className="text-2xl text-gray-400 mb-2">The Real Question Was...</h2>
                <h1 className="text-5xl font-extrabold p-6 bg-indigo-600 rounded-xl mb-10 shadow-lg">
                    "{mainQuestion}"
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {answers.map((answer) => (
                        <div key={answer.playerId} className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-left">
                            <p className="text-xl font-bold text-indigo-300">{answer.name}</p>
                            <p className="text-2xl mt-1 text-white">"{answer.text}"</p>
                        </div>
                    ))}
                </div>

                <div className="mt-12">
                    <p className="text-2xl font-bold flex items-center justify-center gap-3">
                        Discuss and Vote!
                        <Spinner />
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DisplayReveal;
