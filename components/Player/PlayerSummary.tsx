
import React, { useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const PlayerSummary: React.FC = () => {
    const { gameState, me } = useContext(GameContext);
    if (!gameState || !me) return null;
    
    const { impostorId, votes, pointsThisRound } = gameState;
    const myPoints = pointsThisRound?.[me.id] ?? 0;
    const isImpostor = me.id === impostorId;
    let resultMessage = '';

    if (isImpostor) {
        resultMessage = myPoints > 0 ? "You fooled them!" : "You were caught!";
    } else {
        const myVote = votes.find(v => v.voterId === me.id);
        const correctVote = myVote?.targetId === impostorId;
        resultMessage = correctVote ? "You found the impostor!" : "You voted for an innocent person.";
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <div className={`p-8 rounded-full mb-6 ${myPoints > 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                {myPoints > 0 ? <CheckCircleIcon className="h-20 w-20 text-white"/> : <XCircleIcon className="h-20 w-20 text-white"/>}
            </div>
            
            <h1 className="text-4xl font-extrabold">{resultMessage}</h1>
            <p className="text-3xl font-bold mt-4">
                You scored <span className="text-yellow-400">{myPoints}</span> point{myPoints === 1 ? '' : 's'}.
            </p>
            <p className="text-gray-400 mt-8">Waiting for the next round to start...</p>
        </div>
    );
};

export default PlayerSummary;
