
export enum GameStatus {
    LOBBY = 'LOBBY',
    DISTRIBUTE_PROMPTS = 'DISTRIBUTE_PROMPTS',
    ANSWERING = 'ANSWERING',
    REVEAL = 'REVEAL',
    DISCUSS_AND_VOTE = 'DISCUSS_AND_VOTE',
    SCORE = 'SCORE',
    SUMMARY = 'SUMMARY',
    GAME_OVER = 'GAME_OVER',
}

export interface Player {
    id: string;
    name: string;
    isHost: boolean;
    isDisplay: boolean;
}

export interface Answer {
    playerId: string;
    name: string;
    text: string;
}

export interface Vote {
    voterId: string;
    targetId: string;
}

export interface GameState {
    code: string;
    status: GameStatus;
    players: Player[];
    leaderboard: Record<string, number>;
    currentRound: number;
    totalRounds: number;
    answers: Answer[];
    impostorId?: string;
    mainQuestion?: string;
    votes: Vote[];
    pointsThisRound?: Record<string, number>;
    config?: {
        minPlayersToStart: number;
        answeringSeconds: number;
        votingSeconds: number;
    };
}

export type ClientView =
    | { type: 'loading' }
    | { type: 'display', code: string }
    | { type: 'player' }
    | { type: 'host' };

export interface Prompt {
    id: string;
    text: string;
    kind: 'main' | 'impostor';
    pairKey: string;
}
