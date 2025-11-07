import { io, Socket } from 'socket.io-client';

type Listener = (data: any) => void;

export interface ISocketLike {
	on: (event: string, listener: Listener) => void;
	off: (event: string) => void;
	emit: (event: string, data?: any, cb?: (arg?: any) => void) => void;
}

function getServerUrl(): string {
	const envUrl = import.meta.env.VITE_SERVER_URL as string | undefined;
	if (envUrl) {
		if (envUrl === 'same-origin' || envUrl === 'self') return window.location.origin;
		return envUrl;
	}
	const { protocol, hostname } = window.location;
	return `${protocol}//${hostname}:3001`;
}

export function createServerSocket(): ISocketLike {
	const socket: Socket = io(getServerUrl(), { transports: ['websocket'], withCredentials: true });
	return {
		on: (event: string, listener: Listener) => { socket.on(event, listener); },
		off: (event: string) => { socket.off(event); },
		emit: (event: string, data?: any, cb?: (arg?: any) => void) => { (socket as any).emit(event, data, cb); },
	};
}


