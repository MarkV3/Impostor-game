import { GameState, Player, GameStatus, Answer, Vote, Prompt } from '../types';
import { PROMPTS } from '../constants';

type Listener = (data: any) => void;

export class MockSocket {
    private rooms: Map<string, GameState> = new Map();
    private playerToRoom: Map<string, string> = new Map();
    private playerSockets: Map<string, MockSocket> = new Map();
    // Fix: Replaced NodeJS.Timeout with a more portable type that works in browser environments.
    private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
    private listeners: Map<string, Listener[]> = new Map();
    private ownPlayerId: string | null = null;
    private usedPromptKeys: Map<string, Set<string>> = new Map();

    private createPlayer(id: string, name: string, isHost: boolean, isDisplay: boolean): Player {
        return { id, name, isHost, isDisplay };
    }
    
    private getRoom(code: string): GameState | undefined {
        return this.rooms.get(code);
    }
    
    private updateRoom(code: string, newState: Partial<GameState>) {
        const room = this.getRoom(code);
        if (room) {
            const updatedRoom = { ...room, ...newState };
            this.rooms.set(code, updatedRoom);
            this.broadcastSnapshot(code);
        }
    }

    private broadcast(roomId: string, event: string, data: any) {
        this.playerSockets.forEach((socket, playerId) => {
            if (this.playerToRoom.get(playerId) === roomId) {
                socket.triggerEvent(event, data);
            }
        });
    }

    private sendToPlayer(playerId: string, event: string, data: any) {
        this.playerSockets.get(playerId)?.triggerEvent(event, data);
    }

    private broadcastSnapshot(code: string) {
        const room = this.getRoom(code);
        if (room) {
            this.broadcast(code, 'room:snapshot', room);
        }
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
    
    private getRandomPromptPair(roomCode: string): { main: Prompt, impostor: Prompt } | null {
        if (!this.usedPromptKeys.has(roomCode)) {
            this.usedPromptKeys.set(roomCode, new Set());
        }
        const usedKeys = this.usedPromptKeys.get(roomCode)!;
        const availablePairs = PROMPTS.filter(p => p.kind === 'main' && !usedKeys.has(p.pairKey));

        if (availablePairs.length === 0) {
            // All prompts used, reset for this room
            usedKeys.clear();
            return this.getRandomPromptPair(roomCode);
        }

        const mainPrompt = availablePairs[Math.floor(Math.random() * availablePairs.length)];
        const impostorPrompt = PROMPTS.find(p => p.pairKey === mainPrompt.pairKey && p.kind === 'impostor');
        
        if (!impostorPrompt) return null;

        usedKeys.add(mainPrompt.pairKey);
        return { main: mainPrompt, impostor: impostorPrompt };
    }

    // Public methods for client interaction
    on(event: string, listener: Listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(listener);
    }

    off(event: string) {
        this.listeners.delete(event);
    }

    private triggerEvent(event: string, data: any) {
        this.listeners.get(event)?.forEach(listener => listener(data));
    }

    emit(event: string, data?: any) {
        // This simulates client sending message to server
        console.log(`[CLIENT EMIT] ${event}`, data);
        switch (event) {
            case 'room:join':
                this.handleJoin(data);
                break;
            case 'room:start':
                this.handleStart(this.ownPlayerId!);
                break;
            case 'answer:submit':
                this.handleAnswer(this.ownPlayerId!, data.text);
                break;
            case 'vote:submit':
                this.handleVote(this.ownPlayerId!, data.targetMemberId);
                break;
        }
    }

    // Server-side logic handlers
    private handleJoin({ code, name, role }: { code: string, name: string, role: 'player' | 'display' }) {
        const playerId = this.generateId();
        this.ownPlayerId = playerId;
        this.playerSockets.set(playerId, this);
        this.sendToPlayer(playerId, 'assign:id', playerId);
        
        let room = this.getRoom(code);
        if (!room) {
            room = {
                code,
                status: GameStatus.LOBBY,
                players: [],
                leaderboard: {},
                currentRound: 0,
                totalRounds: 6,
                answers: [],
                votes: [],
            };
            this.rooms.set(code, room);
        }

        if (room.status !== GameStatus.LOBBY) {
            this.sendToPlayer(playerId, 'room:error', { message: 'Game has already started.' });
            return;
        }

        if (room.players.length >= 10 && role === 'player') {
             this.sendToPlayer(playerId, 'room:error', { message: 'Room is full.' });
            return;
        }

        const isDisplay = role === 'display';
        const isHost = room.players.filter(p => !p.isDisplay).length === 0 && !isDisplay;
        const newPlayer = this.createPlayer(playerId, name, isHost, isDisplay);
        
        room.players.push(newPlayer);
        room.leaderboard[playerId] = 0;
        this.playerToRoom.set(playerId, code);

        this.updateRoom(code, room);
    }

    private handleStart(playerId: string) {
        const roomId = this.playerToRoom.get(playerId);
        if (!roomId) return;
        const room = this.getRoom(roomId);
        if (!room) return;

        const player = room.players.find(p => p.id === playerId);
        if (!player || !(player.isHost || player.isDisplay)) return;
        
        const gamePlayers = room.players.filter(p => !p.isDisplay);
        if (gamePlayers.length < 4) {
            this.sendToPlayer(playerId, 'room:error', { message: 'Need at least 4 players to start.'});
            return;
        }

        this.updateRoom(roomId, { status: GameStatus.DISTRIBUTE_PROMPTS });
        setTimeout(() => this.distributePrompts(roomId), 500);
    }
    
    private distributePrompts(roomId: string) {
        const room = this.getRoom(roomId);
        if (!room) return;

        const prompts = this.getRandomPromptPair(roomId);
        if(!prompts) {
            // Handle running out of prompts
            this.endGame(roomId, "Ran out of unique prompts!");
            return;
        }
        
        const gamePlayers = room.players.filter(p => !p.isDisplay);
        const impostor = gamePlayers[Math.floor(Math.random() * gamePlayers.length)];

        gamePlayers.forEach(p => {
            if (p.id === impostor.id) {
                this.sendToPlayer(p.id, 'prompt:deliver', { text: prompts.impostor.text, role: 'impostor' });
            } else {
                this.sendToPlayer(p.id, 'prompt:deliver', { text: prompts.main.text, role: 'citizen' });
            }
        });

        const answeringEndsAt = Date.now() + 60 * 1000;
        this.updateRoom(roomId, {
            status: GameStatus.ANSWERING,
            currentRound: room.currentRound + 1,
            impostorId: impostor.id,
            mainQuestion: prompts.main.text,
            answers: [],
            votes: [],
            pointsThisRound: {},
            answeringEndsAt,
        });

        const timerId = setTimeout(() => this.endAnsweringPhase(roomId), 60 * 1000);
        this.timers.set(`${roomId}-answering`, timerId);
    }
    
    private handleAnswer(playerId: string, text: string) {
        const roomId = this.playerToRoom.get(playerId);
        if (!roomId) return;
        const room = this.getRoom(roomId);
        if (!room || room.status !== GameStatus.ANSWERING) return;
        
        const player = room.players.find(p => p.id === playerId);
        if (!player || room.answers.some(a => a.playerId === playerId)) return;
        
        room.answers.push({ playerId, name: player.name, text });
        this.updateRoom(roomId, { answers: room.answers });

        const gamePlayersCount = room.players.filter(p => !p.isDisplay).length;
        if (room.answers.length === gamePlayersCount) {
            const timerId = this.timers.get(`${roomId}-answering`);
            if (timerId) clearTimeout(timerId);
            this.endAnsweringPhase(roomId);
        }
    }

    private endAnsweringPhase(roomId: string) {
        const room = this.getRoom(roomId);
        if (!room) return;
        // ensure players who didn't answer get a placeholder
        const gamePlayers = room.players.filter(p => !p.isDisplay);
        gamePlayers.forEach(p => {
            if (!room.answers.some(a => a.playerId === p.id)) {
                room.answers.push({ playerId: p.id, name: p.name, text: '—' });
            }
        });

        this.updateRoom(roomId, { status: GameStatus.REVEAL, answers: room.answers });
        setTimeout(() => this.startVotingPhase(roomId), 4000);
    }

    private startVotingPhase(roomId: string) {
        const votingEndsAt = Date.now() + 90 * 1000;
        this.updateRoom(roomId, {
            status: GameStatus.DISCUSS_AND_VOTE,
            votingEndsAt,
        });
        
        const timerId = setTimeout(() => this.endVotingPhase(roomId), 90 * 1000);
        this.timers.set(`${roomId}-voting`, timerId);
    }

    private handleVote(playerId: string, targetId: string) {
        const roomId = this.playerToRoom.get(playerId);
        if (!roomId) return;
        const room = this.getRoom(roomId);
        if (!room || room.status !== GameStatus.DISCUSS_AND_VOTE) return;

        const existingVoteIndex = room.votes.findIndex(v => v.voterId === playerId);
        if (existingVoteIndex > -1) {
            room.votes[existingVoteIndex].targetId = targetId;
        } else {
            room.votes.push({ voterId: playerId, targetId });
        }
        this.updateRoom(roomId, { votes: room.votes });
    }
    
    private endVotingPhase(roomId: string) {
        this.updateRoom(roomId, { status: GameStatus.SCORE });
        setTimeout(() => this.calculateScores(roomId), 500);
    }

    private calculateScores(roomId: string) {
        const room = this.getRoom(roomId);
        if (!room || !room.impostorId) return;

        const { players, votes, impostorId, leaderboard } = room;
        const gamePlayers = players.filter(p => !p.isDisplay);
        const N = gamePlayers.length;
        const pointsThisRound: Record<string, number> = {};

        // Calculate citizen scores
        gamePlayers.forEach(p => {
            if (p.id !== impostorId) {
                const vote = votes.find(v => v.voterId === p.id);
                if (vote && vote.targetId === impostorId) {
                    pointsThisRound[p.id] = 1;
                } else {
                    pointsThisRound[p.id] = 0;
                }
            }
        });

        // Calculate impostor score
        const votesAgainstImpostor = votes.filter(v => v.targetId === impostorId).length;
        const threshold = Math.floor(N / 2) + 1;
        if (votesAgainstImpostor < threshold) {
            pointsThisRound[impostorId] = 1;
        } else {
            pointsThisRound[impostorId] = 0;
        }

        // Update leaderboard
        const newLeaderboard = { ...leaderboard };
        Object.entries(pointsThisRound).forEach(([playerId, points]) => {
            newLeaderboard[playerId] = (newLeaderboard[playerId] || 0) + points;
        });

        const summaryEndsAt = Date.now() + 10 * 1000;
        this.updateRoom(roomId, {
            status: GameStatus.SUMMARY,
            leaderboard: newLeaderboard,
            pointsThisRound,
            summaryEndsAt,
        });
        
        const timerId = setTimeout(() => this.endSummary(roomId), 10 * 1000);
        this.timers.set(`${roomId}-summary`, timerId);
    }

    private endSummary(roomId: string) {
        const room = this.getRoom(roomId);
        if (!room) return;

        if (room.currentRound >= room.totalRounds) {
            this.endGame(roomId, "All rounds finished!");
        } else {
            this.updateRoom(roomId, { status: GameStatus.DISTRIBUTE_PROMPTS });
            setTimeout(() => this.distributePrompts(roomId), 500);
        }
    }

    private endGame(roomId: string, reason: string) {
        console.log(`Game over for room ${roomId}: ${reason}`);
        this.updateRoom(roomId, { status: GameStatus.GAME_OVER });
    }
}

// Singleton instance to act as the server
export const mockSocket = new MockSocket();