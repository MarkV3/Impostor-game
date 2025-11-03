
import React, { useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';
import CountdownTimer from '../shared/CountdownTimer';
import { GameStatus } from '../../types';

const DisplayDiscussVote: React.FC = () => {
    const { gameState } = useContext(GameContext);
    if (!gameState || !gameState.votingEndsAt || gameState.status !== GameStatus.DISCUSS_AND_VOTE) return null;

    const { players, currentRound, totalRounds, votes } = gameState;
    const gamePlayers = players.filter(p => !p.isDisplay);
    const votedPlayerIds = new Set(votes.map(v => v.voterId));
    
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-center">
            <div className="absolute top-8 right-8">
                <span className="text-2xl font-bold">Round {currentRound}/{totalRounds}</span>
            </div>
            
            <h1 className="text-6xl font-extrabold mb-8">Discuss & Vote</h1>
            <p className="text-3xl text-gray-300 mb-12">Who is the impostor? Vote on your phone!</p>
            
            <CountdownTimer endsAt={gameState.votingEndsAt} totalDuration={90 * 1000} size={200} strokeWidth={16} />

            <div className="mt-12 w-full max-w-4xl">
                 <h2 className="text-xl mb-4">{votedPlayerIds.size} of {gamePlayers.length} players have voted</h2>
                <div className="w-full bg-gray-700 rounded-full h-4">
                    <div 
                        className="bg-indigo-500 h-4 rounded-full transition-all duration-500" 
                        style={{ width: `${(votedPlayerIds.size / gamePlayers.length) * 100}%` }}>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DisplayDiscussVote;
