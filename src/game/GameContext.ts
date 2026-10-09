import { createContext } from 'react';
import { GameState, Player } from '../../shared/types';
import type { PrivatePrompt } from '../../shared/protocol';

interface GameContextType {
  gameState: GameState | null;
  me: Player | null;
  privatePrompt: PrivatePrompt | null;
  error: string | null;
  actions: {
    joinRoom: (code: string, name: string, role?: 'display' | 'player') => void;
    startGame: () => void;
    submitAnswer: (text: string) => void;
    submitVote: (targetMemberId: string) => void;
    restartGame: () => void;
    completeReveal: () => void;
    continueRound: () => void;
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
    restartGame: () => {},
    completeReveal: () => {},
    continueRound: () => {},
  },
});
