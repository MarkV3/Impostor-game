
import React, { useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';
import TableLayout from './TableLayout';

const DisplayAnswering: React.FC = () => {
    const { gameState } = useContext(GameContext);
    if (!gameState) return null;

    const { players, answers, currentRound, totalRounds } = gameState;
    const gamePlayers = players.filter(p => !p.isDisplay);
    const answeredPlayerIds = new Set(answers.map(a => a.playerId));
    const annotations = gamePlayers.reduce((acc, p) => {
        acc[p.id] = answeredPlayerIds.has(p.id) ? 'Answered' : 'Thinking...';
        return acc;
    }, {} as Record<string, string>);

    return (
        <TableLayout
            players={players}
            annotations={annotations}
            answeredIds={answeredPlayerIds}
            hud={(
                <>
                    <div className="absolute top-6 left-6 z-20 text-sm px-3 py-2 rounded-md bg-white/10 backdrop-blur-md border border-white/20">
                        <span className="font-semibold">Round {currentRound}/{totalRounds}</span>
                    </div>
                </>
            )}
        >
            <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-xl">
                <h1 className="text-5xl font-extrabold mb-4">Who's the Impostor?</h1>
                <p className="text-2xl text-gray-300">A prompt has been sent. Submit your answers now!</p>
            </div>
        </TableLayout>
    );
};

export default DisplayAnswering;
