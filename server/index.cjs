// Lightweight Socket.IO server to host games on the local machine
// Run with: node server/index.cjs

const http = require('http');
const express = require('express');
const path = require('path');
const { Server } = require('socket.io');
const os = require('os');

const PORT = process.env.PORT || 3001;

const {
	createRoom,
	joinRoom,
	removePlayer,
	getPlayerRoomCode,
	setSocketId
} = require('./roomManager.cjs');

const {
	startGame,
	submitAnswer,
	submitVote,
	revealDone,
	restartGame
} = require('./gameLogic.cjs');

const app = express();
const httpServer = http.createServer(app);

// Production frontend serving
if (process.env.SERVE_FRONTEND === 'true') {
	const distPath = path.join(__dirname, '../dist');
	app.use(express.static(distPath));
	app.use((req, res, next) => {
		// If it looks like a file (has extension) or is a socket request, let it fail 404
		if (req.path.includes('.') || req.path.startsWith('/socket.io')) return next();
		res.sendFile(path.join(distPath, 'index.html'));
	});
	console.log('Serving frontend from:', distPath);
}

const io = new Server(httpServer, {
	cors: {
		origin: true, // Allow any origin
		credentials: true,
		methods: ["GET", "POST"]
	}
});

function generateId() { return Math.random().toString(36).slice(2, 11); }

io.on('connection', (socket) => {
	let playerId = generateId();
	socket.emit('assign:id', playerId);
	// We don't set socket ID in manager yet, wait for join
	// Actually, we need to track it for re-joins potentially, but for now follow flow

	socket.on('disconnect', () => {
		const result = removePlayer(playerId);
		if (result) {
			socket.leave(result.roomCode);
		}
	});

	// Restart the room back to lobby with cleared scores and progress
	socket.on('room:restart', () => {
		const roomCode = getPlayerRoomCode(playerId);
		if (roomCode) restartGame(roomCode, playerId, io);
	});

	// Display signals reveal finished
	socket.on('reveal:done', () => {
		const roomCode = getPlayerRoomCode(playerId);
		if (roomCode) revealDone(roomCode, io);
	});

	socket.on('room:create', (payload, cb) => {
		const code = createRoom(payload);
		cb && cb({ ok: true, code });
	});

	socket.on('room:join', ({ code, name, role }) => {
		try {
			const isDisplay = role === 'display';
			const newPlayer = { id: playerId, name, isHost: false, isDisplay }; // isHost will be recalculated in joinRoom logic if we want, but currently logic is a bit mixed.
			// Let's fix isHost logic here or in manager. 
			// Original logic: const isHost = !isDisplay && room.players.filter(p => !p.isDisplay).length === 0;
			// We need to access room to check players.

			// Let's rely on manager to handle adding, but we need to know if host.
			// Refactor joinRoom to handle host assignment?
			// For now, let's keep it simple and do it here or update manager.
			// Manager `joinRoom` just pushes.

			// Let's peek at room first?
			// Or better, update manager to handle it.
			// I'll update joinRoom in manager to handle isHost logic if I can, but I already wrote it.
			// Let's just read room from manager.
			const { getRoom } = require('./roomManager.cjs');
			const room = getRoom(code);
			if (!room) { socket.emit('room:error', { message: 'Room not found.' }); return; }

			const isHost = !isDisplay && room.players.filter(p => !p.isDisplay).length === 0;
			newPlayer.isHost = isHost;

			joinRoom(code, newPlayer, socket.id);
			socket.join(code);
			io.to(code).emit('room:snapshot', room); // joinRoom updates room but doesn't emit? Wait, I added emit to updateRoom but joinRoom modifies directly?
			// My joinRoom implementation:
			// room.players.push(player); ... rooms.set(code, room);
			// It does NOT call updateRoom, so no emit.
			// I should emit here.

		} catch (e) {
			socket.emit('room:error', { message: e.message });
		}
	});

	socket.on('room:start', () => {
		const roomCode = getPlayerRoomCode(playerId);
		if (roomCode) startGame(roomCode, playerId, io);
	});

	socket.on('answer:submit', ({ text }) => {
		const roomCode = getPlayerRoomCode(playerId);
		if (roomCode) submitAnswer(roomCode, playerId, text, io);
	});

	socket.on('vote:submit', ({ targetMemberId }) => {
		const roomCode = getPlayerRoomCode(playerId);
		if (roomCode) submitVote(roomCode, playerId, targetMemberId, io);
	});
});

httpServer.listen(PORT, '0.0.0.0', () => {
	console.log(`Socket.IO server listening on :${PORT}`);
	const osInterfaces = os.networkInterfaces();
	const ips = [];
	for (const name of Object.keys(osInterfaces)) {
		for (const net of osInterfaces[name] || []) {
			if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
		}
	}
	console.log('LAN IPs:', ips.map(ip => `http://${ip}:${PORT}`).join(', '));
});
