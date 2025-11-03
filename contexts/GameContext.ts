
import { createContext } from 'react';
import { GameState, Player } from '../types';

interface GameContextType {
    gameState: GameState | null;
    me: Player | null;
    privatePrompt: { text: string; role: 'citizen' | 'impostor' } | null;
    error: string | null;
    actions: {
        joinRoom: (code: string, name: string, role?: 'display' | 'player') => void;
        startGame: () => void;
        submitAnswer: (text: string) => void;
        submitVote: (targetMemberId: string) => void;
    };
}

export const GameContext = createContext<GameContextType>({
    gameState: null,
    me: null,
    privatePrompt: null,
    error: null,
    actions: {
        joinRoom: () => {},
        startGame: () => {},
        submitAnswer: () => {},
        submitVote: () => {},
    },
});
