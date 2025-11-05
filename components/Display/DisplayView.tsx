
import React, { useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';
import { GameStatus } from '../../types';
import DisplayLobby from './DisplayLobby';
import DisplayAnswering from './DisplayAnswering';
import DisplayReveal from './DisplayReveal';
import DisplayDiscussVote from './DisplayDiscussVote';
import DisplaySummary from './DisplaySummary';
import DisplayGameOver from './DisplayGameOver';
import Spinner from '../shared/Spinner';
import PhaseTransition from '../shared/PhaseTransition';

const DisplayView: React.FC = () => {
    const { gameState } = useContext(GameContext);

    if (!gameState) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-center p-4">
                <Spinner />
                <h1 className="text-2xl mt-4 font-bold">Connecting to Room...</h1>
                <p className="text-gray-400">Make sure the room code in the URL is correct.</p>
            </div>
        );
    }
    
    const renderContent = () => {
        switch (gameState.status) {
            case GameStatus.LOBBY:
                return <DisplayLobby />;
            case GameStatus.ANSWERING:
                return <DisplayAnswering />;
            case GameStatus.REVEAL:
                return <DisplayReveal />;
            case GameStatus.DISCUSS_AND_VOTE:
                return <DisplayDiscussVote />;
            case GameStatus.SUMMARY:
                return <DisplaySummary />;
            case GameStatus.GAME_OVER:
                return <DisplayGameOver />;
            case GameStatus.DISTRIBUTE_PROMPTS:
            case GameStatus.SCORE:
                return (
                    <div className="flex flex-col items-center justify-center h-screen">
                        <Spinner />
                        <p className="mt-4 text-xl">Starting Round {gameState.currentRound + 1}...</p>
                    </div>
                );
            default:
                return <div>Unknown game state</div>;
        }
    };

    return (
        <div className="p-4 md:p-8">
            <PhaseTransition statusKey={gameState.status}>
                {renderContent()}
            </PhaseTransition>
        </div>
    );
};

export default DisplayView;
