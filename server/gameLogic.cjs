const PROMPTS = require('../shared/prompts.json');
const { getRoom, updateRoom, getSocketId } = require('./roomManager.cjs');

/** @type {Map<string, NodeJS.Timeout>} */
const timers = new Map();
/** @type {Map<string, Set<string>>} */
const usedPromptKeysByRoom = new Map();

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

function startGame(roomCode, playerId, io) {
    const room = getRoom(roomCode);
    if (!room) return;

    const me = room.players.find(p => p.id === playerId);
    if (!me || !(me.isHost || me.isDisplay)) return;

    const gamePlayers = room.players.filter(p => !p.isDisplay);
    if (gamePlayers.length < (room.config?.minPlayersToStart || 3)) {
        throw new Error(`Need at least ${room.config?.minPlayersToStart || 3} players to start.`);
    }

    updateRoom(roomCode, { status: 'DISTRIBUTE_PROMPTS' }, io);
    setTimeout(() => distributePrompts(roomCode, io), 300);
}

function distributePrompts(roomCode, io) {
    const room = getRoom(roomCode);
    if (!room) return;

    const pair = getRandomPromptPair(roomCode);
    if (!pair) return endGame(roomCode, 'Ran out of prompts', io);

    const gamePlayers = room.players.filter(p => !p.isDisplay);
    if (gamePlayers.length === 0) {
        updateRoom(roomCode, { status: 'LOBBY' }, io);
        return;
    }

    const impostor = gamePlayers[Math.floor(Math.random() * gamePlayers.length)];

    gamePlayers.forEach(p => {
        const sid = getSocketId(p.id);
        if (!sid) return;
        if (p.id === impostor.id) io.to(sid).emit('prompt:deliver', { text: pair.impostor.text, role: 'impostor' });
        else io.to(sid).emit('prompt:deliver', { text: pair.main.text, role: 'citizen' });
    });

    updateRoom(roomCode, {
        status: 'ANSWERING',
        currentRound: room.currentRound + 1,
        impostorId: impostor.id,
        mainQuestion: pair.main.text,
        answers: [],
        votes: [],
        pointsThisRound: {},
    }, io);
}

function submitAnswer(roomCode, playerId, text, io) {
    const room = getRoom(roomCode);
    if (!room || room.status !== 'ANSWERING') return;
    if (room.answers.some(a => a.playerId === playerId)) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.isDisplay) return;

    room.answers.push({ playerId, name: player.name, text });
    updateRoom(roomCode, { answers: room.answers }, io);

    const totalGamePlayers = room.players.filter(p => !p.isDisplay).length;
    if (room.answers.length === totalGamePlayers) {
        setTimeout(() => endAnsweringPhase(roomCode, io), 2000);
    }
}

function endAnsweringPhase(roomCode, io) {
    const room = getRoom(roomCode);
    if (!room) return;

    const gamePlayers = room.players.filter(p => !p.isDisplay);
    gamePlayers.forEach(p => {
        if (!room.answers.some(a => a.playerId === p.id)) room.answers.push({ playerId: p.id, name: p.name, text: '—' });
    });

    updateRoom(roomCode, { status: 'REVEAL', answers: room.answers }, io);
}

function revealDone(roomCode, io) {
    const t = timers.get(`${roomCode}-reveal`);
    if (t) clearTimeout(t);
    timers.delete(`${roomCode}-reveal`);
    startVotingPhase(roomCode, io);
}

function startVotingPhase(roomCode, io) {
    const room = getRoom(roomCode);
    if (!room) return;

    updateRoom(roomCode, { status: 'DISCUSS_AND_VOTE' }, io);
}

function submitVote(roomCode, playerId, targetMemberId, io) {
    const room = getRoom(roomCode);
    if (!room || room.status !== 'DISCUSS_AND_VOTE') return;

    const existing = room.votes.findIndex(v => v.voterId === playerId);
    if (existing > -1) room.votes[existing].targetId = targetMemberId;
    else room.votes.push({ voterId: playerId, targetId: targetMemberId });

    updateRoom(roomCode, { votes: room.votes }, io);

    const totalGamePlayers = room.players.filter(p => !p.isDisplay).length;
    const uniqueVoters = new Set(room.votes.map(v => v.voterId));

    if (uniqueVoters.size >= totalGamePlayers) {
        setTimeout(() => endVotingPhase(roomCode, io), 2500);
    }
}

function endVotingPhase(roomCode, io) {
    updateRoom(roomCode, { status: 'SCORE' }, io);
    setTimeout(() => calculateScores(roomCode, io), 300);
}

function calculateScores(roomCode, io) {
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

    updateRoom(roomCode, { status: 'SUMMARY', leaderboard, pointsThisRound }, io);

    const tid = setTimeout(() => endSummary(roomCode, io), 15 * 1000);
    timers.set(`${roomCode}-summary`, tid);
}

function endSummary(roomCode, io) {
    const room = getRoom(roomCode);
    if (!room) return;

    if (room.currentRound >= room.totalRounds) return endGame(roomCode, 'All rounds finished', io);

    updateRoom(roomCode, { status: 'DISTRIBUTE_PROMPTS' }, io);
    setTimeout(() => distributePrompts(roomCode, io), 300);
}

function endGame(roomCode, reason, io) {
    updateRoom(roomCode, { status: 'GAME_OVER' }, io);
}

function restartGame(roomCode, playerId, io) {
    const room = getRoom(roomCode);
    if (!room) return;

    const me = room.players.find(p => p.id === playerId);
    if (!me || !(me.isHost || me.isDisplay)) return;

    ['answering', 'voting', 'summary', 'reveal'].forEach(k => {
        const t = timers.get(`${roomCode}-${k}`);
        if (t) clearTimeout(t);
        timers.delete(`${roomCode}-${k}`);
    });

    usedPromptKeysByRoom.delete(roomCode);

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
    }, io);
}

module.exports = {
    startGame,
    submitAnswer,
    submitVote,
    revealDone,
    restartGame
};
