
import React, { useState, useContext, useEffect } from 'react';
import { GameContext } from '../../contexts/GameContext';
import Button from '../shared/Button';
import CountdownTimer from '../shared/CountdownTimer';

interface PlayerVotingProps {
    hasVoted: boolean;
}

const PlayerVoting: React.FC<PlayerVotingProps> = ({ hasVoted }) => {
    const { gameState, me, actions } = useContext(GameContext);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        setSubmitted(hasVoted);
    }, [hasVoted]);
    
    if (!gameState || !me || !gameState.votingEndsAt) return null;

    const otherPlayers = gameState.players.filter(p => !p.isDisplay && p.id !== me.id);

    const handleVote = (playerId: string) => {
        setSelectedPlayerId(playerId);
        actions.submitVote(playerId);
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="absolute top-4 right-4">
                <CountdownTimer endsAt={gameState.votingEndsAt} totalDuration={90 * 1000} />
            </div>
            <div className="w-full max-w-md text-center">
                <h1 className="text-3xl font-bold mb-2">Who is the Impostor?</h1>
                <p className="text-gray-400 mb-6">Select a player to cast your vote.</p>

                <div className="grid grid-cols-2 gap-4">
                    {otherPlayers.map(player => (
                        <button
                            key={player.id}
                            onClick={() => handleVote(player.id)}
                            className={`p-4 rounded-lg text-lg font-bold transition-all duration-200
                                ${selectedPlayerId === player.id 
                                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-400' 
                                    : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                        >
                            {player.name}
                        </button>
                    ))}
                </div>

                {submitted && (
                    <div className="mt-6 bg-green-800 text-green-200 p-3 rounded-lg">
                        Vote for <span className="font-bold">{gameState.players.find(p=>p.id === selectedPlayerId)?.name}</span> recorded! You can change it until the time is up.
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerVoting;
