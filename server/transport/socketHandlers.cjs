const { randomUUID, randomBytes } = require('node:crypto');
const {
  createRoom,
  getRoom,
  joinRoom,
  getPlayerRoomCode,
  getSocketId,
  attachPlayerSocket,
  detachPlayerSocket,
  getPrivatePrompt,
} = require('../game/rooms.cjs');
const {
  startGame,
  submitAnswer,
  submitVote,
  revealDone,
  continueRound,
  restartGame,
} = require('../game/engine.cjs');

function registerSocketHandlers(io) {
  // Sessions live as long as the in-memory game, rather than as long as a WebSocket.
  // The secret token is sent only to its owning client, never in room snapshots.
  const sessions = new Map();
  io.on('connection', (socket) => {
    const requestedToken = socket.handshake.auth?.sessionToken;
    const previousSession =
      typeof requestedToken === 'string' ? sessions.get(requestedToken) : undefined;
    const resumed = Boolean(previousSession);
    const token = resumed ? requestedToken : randomBytes(32).toString('hex');
    const playerId = previousSession?.playerId ?? randomUUID();
    const session = { playerId, socketId: socket.id };
    sessions.set(token, session);

    const roomCode = getPlayerRoomCode(playerId);
    if (roomCode) attachPlayerSocket(playerId, socket.id);
    // Claim ownership before retiring the previous socket, including before joining.
    if (previousSession) io.sockets.sockets.get(previousSession.socketId)?.disconnect(true);
    socket.emit('assign:id', playerId);
    socket.emit('assign:session', { token });

    const sendRoom = (code) => {
      const prompt = getPrivatePrompt(playerId);
      if (prompt) socket.emit('prompt:deliver', prompt);
      socket.emit('room:snapshot', getRoom(code));
    };
    if (roomCode && getRoom(roomCode)) {
      socket.join(roomCode);
      sendRoom(roomCode);
      console.info('[connection]', {
        event: 'resumed',
        playerId,
        roomCode,
        phase: getRoom(roomCode).status,
      });
    } else if (requestedToken && !resumed) {
      socket.emit('room:error', {
        message: 'Your previous game has ended. Please join a room again.',
      });
    }

    // Keep transport failures on the requesting connection instead of crashing
    // the process when the engine rejects an action (for example, too few players).
    const handle = (action) => (payload) => {
      try {
        if (sessions.get(token) !== session) return;
        action(payload);
      } catch (error) {
        socket.emit('room:error', { message: error.message });
      }
    };
    const inRoom = (action) =>
      handle((payload) => {
        const roomCode = getPlayerRoomCode(playerId);
        if (roomCode && getSocketId(playerId) === socket.id) action(roomCode, payload);
      });

    socket.on('disconnect', (reason) => {
      const code = getPlayerRoomCode(playerId);
      detachPlayerSocket(playerId, socket.id);
      if (!code) {
        if (sessions.get(token) === session) sessions.delete(token);
      } else
        console.info('[connection]', {
          event: 'disconnected',
          playerId,
          roomCode: code,
          phase: getRoom(code)?.status,
          reason,
        });
    });

    socket.on('room:create', (payload, reply) => {
      const code = createRoom(payload);
      if (reply) reply({ ok: true, code });
    });

    socket.on(
      'room:join',
      handle(({ code, name, role }) => {
        const room = getRoom(code);
        if (!room) throw new Error('Room not found.');

        const isDisplay = role === 'display';
        const isHost =
          !isDisplay && room.players.filter((player) => !player.isDisplay).length === 0;
        const joinedRoom = joinRoom(code, { id: playerId, name, isHost, isDisplay }, socket.id);
        socket.join(code);
        sendRoom(code);
        socket.to(code).emit('room:snapshot', joinedRoom);
      }),
    );

    socket.on(
      'room:start',
      inRoom((code) => startGame(code, playerId, io)),
    );
    socket.on(
      'room:restart',
      inRoom((code) => restartGame(code, playerId, io)),
    );
    socket.on(
      'reveal:done',
      inRoom((code) => revealDone(code, io, playerId)),
    );
    socket.on(
      'round:continue',
      inRoom((code) => continueRound(code, playerId, io)),
    );
    socket.on(
      'answer:submit',
      inRoom((code, { text }) => submitAnswer(code, playerId, text, io)),
    );
    socket.on(
      'vote:submit',
      inRoom((code, { targetMemberId }) => submitVote(code, playerId, targetMemberId, io)),
    );
  });
}

module.exports = { registerSocketHandlers };
