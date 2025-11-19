const { Server } = require('socket.io');

/** @type {Map<string, any>} */
const rooms = new Map();
/** @type {Map<string, string>} */
const playerToRoom = new Map();
/** @type {Map<string, string>} */
const playerIdToSocketId = new Map();

function generateCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let c = '';
    for (let i = 0; i < 6; i++) c += alphabet[Math.floor(Math.random() * alphabet.length)];
    return c;
}

function getRoom(code) { return rooms.get(code); }

function updateRoom(code, partial, io) {
    const r = getRoom(code);
    if (!r) return;
    const updated = { ...r, ...partial };
    rooms.set(code, updated);
    if (io) io.to(code).emit('room:snapshot', updated);
    return updated;
}

function createRoom(payload) {
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
    return code;
}

function joinRoom(code, player, socketId) {
    const room = getRoom(code);
    if (!room) throw new Error('Room not found.');
    if (room.status !== 'LOBBY') throw new Error('Game has already started.');

    room.players.push(player);
    room.leaderboard[player.id] = 0;
    rooms.set(code, room);

    playerToRoom.set(player.id, code);
    playerIdToSocketId.set(player.id, socketId);

    return room;
}

function removePlayer(playerId) {
    const roomCode = playerToRoom.get(playerId);
    if (!roomCode) return null;

    const room = getRoom(roomCode);
    if (!room) return null;

    const remaining = room.players.filter(p => p.id !== playerId);
    updateRoom(roomCode, { players: remaining }); // Note: caller needs to emit if needed, or pass io to updateRoom

    playerToRoom.delete(playerId);
    playerIdToSocketId.delete(playerId);

    return { roomCode, remaining };
}

function getPlayerRoomCode(playerId) {
    return playerToRoom.get(playerId);
}

function getSocketId(playerId) {
    return playerIdToSocketId.get(playerId);
}

function setSocketId(playerId, socketId) {
    playerIdToSocketId.set(playerId, socketId);
}

module.exports = {
    getRoom,
    updateRoom,
    createRoom,
    joinRoom,
    removePlayer,
    getPlayerRoomCode,
    getSocketId,
    setSocketId
};
