// Lightweight Socket.IO server to host games on the local machine
// Run with: node server/index.cjs

const http = require('http');
const { Server } = require('socket.io');
const os = require('os');

const PORT = process.env.PORT || 3001;

const PROMPTS = require('./prompts.cjs');

const io = new Server(http.createServer(), {
	cors: { origin: true, credentials: true }
});

/** @type {Map<string, any>} */
const rooms = new Map();
/** @type {Map<string, string>} */
const playerToRoom = new Map();
/** @type {Map<string, string>} */
const playerIdToSocketId = new Map();
/** @type {Map<string, NodeJS.Timeout>} */
const timers = new Map();
/** @type {Map<string, Set<string>>} */
const usedPromptKeysByRoom = new Map();

function generateId() { return Math.random().toString(36).slice(2, 11); }
function generateCode() {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
	let c = '';
	for (let i = 0; i < 6; i++) c += alphabet[Math.floor(Math.random() * alphabet.length)];
	return c;
}

function getRoom(code) { return rooms.get(code); }
function sanitizedRoom(room) { return room; }
function updateRoom(code, partial) {
	const r = getRoom(code);
	if (!r) return;
	const updated = { ...r, ...partial };
	rooms.set(code, updated);
	io.to(code).emit('room:snapshot', sanitizedRoom(updated));
}

function getRandomPromptPair(roomCode) {
	if (!usedPromptKeysByRoom.has(roomCode)) usedPromptKeysByRoom.set(roomCode, new Set());
	const used = usedPromptKeysByRoom.get(roomCode);
	const mains = PROMPTS.filter(p => p.kind === 'main' && !used.has(p.pairKey));
	if (mains.length === 0) { used.clear(); return getRandomPromptPair(roomCode); }
	const main = mains[Math.floor(Math.random() * mains.length)];
	const impostor = PROMPTS.find(p => p.pairKey === main.pairKey && p.kind === 'impostor');
	if (!impostor) return null;
	used.add(main.pairKey);
	return { main, impostor };
}

io.on('connection', (socket) => {
	let playerId = generateId();
	socket.emit('assign:id', playerId);
	playerIdToSocketId.set(playerId, socket.id);

	socket.on('disconnect', () => {
		const roomCode = playerToRoom.get(playerId);
		if (!roomCode) return;
		const room = getRoom(roomCode);
		if (!room) return;
		const remaining = room.players.filter(p => p.id !== playerId);
		updateRoom(roomCode, { players: remaining });
		playerToRoom.delete(playerId);
		playerIdToSocketId.delete(playerId);
		socket.leave(roomCode);
	});

	// Restart the room back to lobby with cleared scores and progress
	socket.on('room:restart', () => {
		const roomCode = playerToRoom.get(playerId);
		if (!roomCode) return;
		const room = getRoom(roomCode);
		if (!room) return;
		const me = room.players.find(p => p.id === playerId);
		if (!me || !(me.isHost || me.isDisplay)) return;
		// Clear timers
		['answering', 'voting', 'summary'].forEach(k => {
			const t = timers.get(`${roomCode}-${k}`);
			if (t) clearTimeout(t);
			timers.delete(`${roomCode}-${k}`);
		});
		// Reset used prompts
		usedPromptKeysByRoom.delete(roomCode);
		// Reset leaderboard and state, keep players
		const freshLeaderboard = {};
		room.players.forEach(p => { freshLeaderboard[p.id] = 0; });
		updateRoom(roomCode, {
			status: 'LOBBY',
			currentRound: 0,
			answers: [],
			votes: [],
			impostorId: undefined,
			mainQuestion: undefined,
			leaderboard: freshLeaderboard,
			answeringEndsAt: undefined,
			votingEndsAt: undefined,
			summaryEndsAt: undefined,
		});
	});

	// Display signals reveal finished
	socket.on('reveal:done', () => {
		const roomCode = playerToRoom.get(playerId);
		if (!roomCode) return;
		const t = timers.get(`${roomCode}-reveal`);
		if (t) clearTimeout(t);
		timers.delete(`${roomCode}-reveal`);
		startVotingPhase(roomCode);
	});

	socket.on('room:create', (payload, cb) => {
		const code = generateCode();
		const room = {
			code,
			status: 'LOBBY',
			players: [],
			leaderboard: {},
			currentRound: 0,
			totalRounds: Math.max(2, Math.min(10, Number(payload?.totalRounds || 6))),
			answers: [],
			votes: [],
			config: {
				minPlayersToStart: Math.max(3, Math.min(10, Number(payload?.minPlayersToStart || 4))),
				answeringSeconds: Math.max(10, Math.min(300, Number(payload?.answeringSeconds || 60))),
				votingSeconds: Math.max(10, Math.min(300, Number(payload?.votingSeconds || 90)))
			}
		};
		rooms.set(code, room);
		cb && cb({ ok: true, code });
	});

	socket.on('room:join', ({ code, name, role }) => {
		const room = getRoom(code);
		if (!room) { socket.emit('room:error', { message: 'Room not found.' }); return; }
		if (room.status !== 'LOBBY') { socket.emit('room:error', { message: 'Game has already started.' }); return; }
		const isDisplay = role === 'display';
		const isHost = !isDisplay && room.players.filter(p => !p.isDisplay).length === 0;
		const newPlayer = { id: playerId, name, isHost, isDisplay };
		room.players.push(newPlayer);
		room.leaderboard[playerId] = 0;
		rooms.set(code, room);
		playerToRoom.set(playerId, code);
		socket.join(code);
		io.to(code).emit('room:snapshot', sanitizedRoom(room));
	});

	socket.on('room:start', () => {
		const roomCode = playerToRoom.get(playerId);
		if (!roomCode) return;
		const room = getRoom(roomCode);
		if (!room) return;
		const me = room.players.find(p => p.id === playerId);
		if (!me || !(me.isHost || me.isDisplay)) return;
		const gamePlayers = room.players.filter(p => !p.isDisplay);
		if (gamePlayers.length < (room.config?.minPlayersToStart || 4)) {
			socket.emit('room:error', { message: `Need at least ${room.config?.minPlayersToStart || 4} players to start.` });
			return;
		}
		updateRoom(roomCode, { status: 'DISTRIBUTE_PROMPTS' });
		setTimeout(() => distributePrompts(roomCode), 300);
	});

	socket.on('answer:submit', ({ text }) => {
		const roomCode = playerToRoom.get(playerId);
		if (!roomCode) return;
		const room = getRoom(roomCode);
		if (!room || room.status !== 'ANSWERING') return;
		if (room.answers.some(a => a.playerId === playerId)) return;
		const player = room.players.find(p => p.id === playerId);
		if (!player || player.isDisplay) return;
		room.answers.push({ playerId, name: player.name, text });
		updateRoom(roomCode, { answers: room.answers });
		const totalGamePlayers = room.players.filter(p => !p.isDisplay).length;
		if (room.answers.length === totalGamePlayers) {
			const t = timers.get(`${roomCode}-answering`);
			if (t) clearTimeout(t);
			endAnsweringPhase(roomCode);
		}
	});

	socket.on('vote:submit', ({ targetMemberId }) => {
		const roomCode = playerToRoom.get(playerId);
		if (!roomCode) return;
		const room = getRoom(roomCode);
		if (!room || room.status !== 'DISCUSS_AND_VOTE') return;
		const existing = room.votes.findIndex(v => v.voterId === playerId);
		if (existing > -1) room.votes[existing].targetId = targetMemberId; else room.votes.push({ voterId: playerId, targetId: targetMemberId });
		updateRoom(roomCode, { votes: room.votes });
		// If all players have voted, end voting early after a short notice
		const totalGamePlayers = room.players.filter(p => !p.isDisplay).length;
		const uniqueVoters = new Set(room.votes.map(v => v.voterId));
		if (uniqueVoters.size >= totalGamePlayers) {
			const t = timers.get(`${roomCode}-voting`);
			if (t) clearTimeout(t);
			setTimeout(() => endVotingPhase(roomCode), 1500);
		}
	});
});

function distributePrompts(roomCode) {
	const room = getRoom(roomCode);
	if (!room) return;
	const pair = getRandomPromptPair(roomCode);
	if (!pair) return endGame(roomCode, 'Ran out of prompts');
	const gamePlayers = room.players.filter(p => !p.isDisplay);
    if (gamePlayers.length === 0) {
        // Players left between start and distribution; return to lobby safely
        updateRoom(roomCode, { status: 'LOBBY' });
        return;
    }
    const impostor = gamePlayers[Math.floor(Math.random() * gamePlayers.length)];
	gamePlayers.forEach(p => {
		const sid = playerIdToSocketId.get(p.id);
		if (!sid) return;
		if (p.id === impostor.id) io.to(sid).emit('prompt:deliver', { text: pair.impostor.text, role: 'impostor' });
		else io.to(sid).emit('prompt:deliver', { text: pair.main.text, role: 'citizen' });
	});
	const answeringEndsAt = Date.now() + (room.config?.answeringSeconds || 60) * 1000;
	updateRoom(roomCode, {
		status: 'ANSWERING',
		currentRound: room.currentRound + 1,
		impostorId: impostor.id,
		mainQuestion: pair.main.text,
		answers: [],
		votes: [],
		pointsThisRound: {},
		answeringEndsAt
	});
	const tid = setTimeout(() => endAnsweringPhase(roomCode), (room.config?.answeringSeconds || 60) * 1000);
	timers.set(`${roomCode}-answering`, tid);
}

function endAnsweringPhase(roomCode) {
	const room = getRoom(roomCode);
	if (!room) return;
	const gamePlayers = room.players.filter(p => !p.isDisplay);
	gamePlayers.forEach(p => {
		if (!room.answers.some(a => a.playerId === p.id)) room.answers.push({ playerId: p.id, name: p.name, text: '—' });
	});
	updateRoom(roomCode, { status: 'REVEAL', answers: room.answers });
	// Prefer waiting for the display to explicitly finish; keep a long fallback
	const fallbackMs = 120000; // 2 minutes
	const tid = setTimeout(() => startVotingPhase(roomCode), fallbackMs);
	timers.set(`${roomCode}-reveal`, tid);
}

function startVotingPhase(roomCode) {
	const room = getRoom(roomCode);
	if (!room) return;
	const votingEndsAt = Date.now() + (room.config?.votingSeconds || 90) * 1000;
	updateRoom(roomCode, { status: 'DISCUSS_AND_VOTE', votingEndsAt });
	const tid = setTimeout(() => endVotingPhase(roomCode), (room.config?.votingSeconds || 90) * 1000);
	timers.set(`${roomCode}-voting`, tid);
}

function endVotingPhase(roomCode) {
	updateRoom(roomCode, { status: 'SCORE' });
	setTimeout(() => calculateScores(roomCode), 300);
}

function calculateScores(roomCode) {
	const room = getRoom(roomCode);
	if (!room || !room.impostorId) return;
	const gamePlayers = room.players.filter(p => !p.isDisplay);
	const N = gamePlayers.length;
	const pointsThisRound = {};
	gamePlayers.forEach(p => {
		if (p.id !== room.impostorId) {
			const vote = room.votes.find(v => v.voterId === p.id);
			pointsThisRound[p.id] = vote && vote.targetId === room.impostorId ? 1 : 0;
		}
	});
	const votesAgainstImpostor = room.votes.filter(v => v.targetId === room.impostorId).length;
	const threshold = Math.floor(N / 2) + 1;
	pointsThisRound[room.impostorId] = votesAgainstImpostor < threshold ? 1 : 0;
	const leaderboard = { ...room.leaderboard };
	Object.entries(pointsThisRound).forEach(([pid, pts]) => { leaderboard[pid] = (leaderboard[pid] || 0) + pts; });
	const summaryEndsAt = Date.now() + 10 * 1000;
	updateRoom(roomCode, { status: 'SUMMARY', leaderboard, pointsThisRound, summaryEndsAt });
	const tid = setTimeout(() => endSummary(roomCode), 10 * 1000);
	timers.set(`${roomCode}-summary`, tid);
}

function endSummary(roomCode) {
	const room = getRoom(roomCode);
	if (!room) return;
	if (room.currentRound >= room.totalRounds) return endGame(roomCode, 'All rounds finished');
	updateRoom(roomCode, { status: 'DISTRIBUTE_PROMPTS' });
	setTimeout(() => distributePrompts(roomCode), 300);
}

function endGame(roomCode) { updateRoom(roomCode, { status: 'GAME_OVER' }); }

io.listen(PORT);

const osInterfaces = os.networkInterfaces();
const ips = [];
for (const name of Object.keys(osInterfaces)) {
	for (const net of osInterfaces[name] || []) {
		if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
	}
}
console.log(`Socket.IO server listening on :${PORT}`);
console.log('LAN IPs:', ips.map(ip => `http://${ip}:${PORT}`).join(', '));


