
import React, { useState, useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';
import Button from '../shared/Button';
import Card from '../shared/Card';
import CountdownTimer from '../shared/CountdownTimer';

const PlayerAnswering: React.FC = () => {
    const [answer, setAnswer] = useState('');
    const { privatePrompt, actions, gameState } = useContext(GameContext);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (answer.trim()) {
            actions.submitAnswer(answer.trim());
        }
    };

    if (!privatePrompt || !gameState?.answeringEndsAt) return null;

    const charLimit = 200;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="absolute top-4 right-4">
                <CountdownTimer endsAt={gameState.answeringEndsAt} totalDuration={60 * 1000} />
            </div>
            <div className="w-full max-w-md">
                <Card className="bg-indigo-900 border-indigo-700">
                    <p className="text-indigo-300 text-sm font-bold uppercase tracking-wider">{privatePrompt.role}</p>
                    <p className="text-2xl font-bold mt-2 text-white">{privatePrompt.text}</p>
                </Card>

                <form onSubmit={handleSubmit} className="mt-6">
                    <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Your answer..."
                        maxLength={charLimit}
                        rows={3}
                        className="w-full bg-gray-800 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 text-lg"
                        required
                    />
                    <div className="text-right text-sm text-gray-400 mt-1">
                        {answer.length}/{charLimit}
                    </div>
                    <Button type="submit" className="mt-4" disabled={!answer.trim()}>
                        Submit Answer
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default PlayerAnswering;
