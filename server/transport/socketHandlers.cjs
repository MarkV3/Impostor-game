const {
  createRoom,
  getRoom,
  joinRoom,
  removePlayer,
  getPlayerRoomCode,
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
  io.on('connection', (socket) => {
    const playerId = Math.random().toString(36).slice(2, 11);
    socket.emit('assign:id', playerId);

    // Keep transport failures on the requesting connection instead of crashing
    // the process when the engine rejects an action (for example, too few players).
    const handle = (action) => (payload) => {
      try {
        action(payload);
      } catch (error) {
        socket.emit('room:error', { message: error.message });
      }
    };
    const inRoom = (action) =>
      handle((payload) => {
        const roomCode = getPlayerRoomCode(playerId);
        if (roomCode) action(roomCode, payload);
      });

    socket.on('disconnect', () => {
      const result = removePlayer(playerId);
      if (result) socket.leave(result.roomCode);
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
        joinRoom(code, { id: playerId, name, isHost, isDisplay }, socket.id);
        socket.join(code);
        io.to(code).emit('room:snapshot', room);
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
