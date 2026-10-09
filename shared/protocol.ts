import type { GameState } from './types';

export interface PrivatePrompt {
  text: string;
  role: 'citizen' | 'impostor';
}

export interface RoomOptions {
  minPlayersToStart: number;
  totalRounds: number;
}

export type CreateRoomResult = { ok: true; code: string } | { ok: false; message?: string };

export interface ServerToClientEvents {
  'assign:id': (id: string) => void;
  'room:snapshot': (room: GameState) => void;
  'room:error': (error: { message: string }) => void;
  'prompt:deliver': (prompt: PrivatePrompt) => void;
}

export interface ClientToServerEvents {
  'room:create': (options: RoomOptions, reply: (result: CreateRoomResult) => void) => void;
  'room:join': (player: { code: string; name: string; role: 'player' | 'display' }) => void;
  'room:start': () => void;
  'room:restart': () => void;
  'answer:submit': (answer: { text: string }) => void;
  'vote:submit': (vote: { targetMemberId: string }) => void;
  'reveal:done': () => void;
  'round:continue': () => void;
}
