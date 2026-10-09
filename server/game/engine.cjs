const { getRandomPromptPair, resetPrompts } = require('./prompts.cjs');
const { scoreRound } = require('./scoring.cjs');
const { getRoom, updateRoom, getSocketId } = require('./rooms.cjs');
const pacing = require('../../shared/presentation.json');

/** @type {Map<string, NodeJS.Timeout>} */
const timers = new Map();
function schedule(code, key, delay, callback) {
  const timerKey = `${code}-${key}`;
  const previous = timers.get(timerKey);
  if (previous) clearTimeout(previous);
  timers.set(
    timerKey,
    setTimeout(() => {
      timers.delete(timerKey);
      callback();
    }, delay),
  );
}
function canHost(room, playerId) {
  return room?.players.some(
    (player) => player.id === playerId && (player.isHost || player.isDisplay),
  );
}
function startGame(roomCode, playerId, io) {
  const room = getRoom(roomCode);
  if (!room || room.status !== 'LOBBY' || !canHost(room, playerId)) return;
  const players = room.players.filter((player) => !player.isDisplay);
  if (players.length < (room.config?.minPlayersToStart || 4)) {
    throw new Error(`Need at least ${room.config?.minPlayersToStart || 4} players to start.`);
  }
  updateRoom(roomCode, { status: 'DISTRIBUTE_PROMPTS' }, io);
  schedule(roomCode, 'deal', 300, () => distributePrompts(roomCode, io));
}
function distributePrompts(roomCode, io) {
  const room = getRoom(roomCode);
  if (!room || room.status !== 'DISTRIBUTE_PROMPTS') return;
  const pair = getRandomPromptPair(roomCode);
  if (!pair) return updateRoom(roomCode, { status: 'GAME_OVER' }, io);
  const players = room.players.filter((player) => !player.isDisplay);
  if (!players.length) return updateRoom(roomCode, { status: 'LOBBY' }, io);
  const impostor = players[Math.floor(Math.random() * players.length)];
  players.forEach((player) => {
    const socketId = getSocketId(player.id);
    if (!socketId) return;
    const isImpostor = player.id === impostor.id;
    io.to(socketId).emit('prompt:deliver', {
      text: isImpostor ? pair.impostor.text : pair.main.text,
      role: isImpostor ? 'impostor' : 'citizen',
    });
  });
  updateRoom(
    roomCode,
    {
      status: 'ANSWERING',
      currentRound: room.currentRound + 1,
      impostorId: impostor.id,
      mainQuestion: pair.main.text,
      answers: [],
      votes: [],
      pointsThisRound: {},
      verdictRevealsAt: undefined,
    },
    io,
  );
}
function submitAnswer(roomCode, playerId, text, io) {
  const room = getRoom(roomCode);
  if (
    !room ||
    room.status !== 'ANSWERING' ||
    room.answers.some((answer) => answer.playerId === playerId)
  )
    return;
  const player = room.players.find((item) => item.id === playerId);
  if (!player || player.isDisplay || typeof text !== 'string' || !text.trim()) return;
  room.answers.push({
    playerId,
    name: player.name,
    text: text.trim().slice(0, pacing.answerMaxLength),
  });
  const players = room.players.filter((item) => !item.isDisplay);
  const allAnswered = players.every((item) =>
    room.answers.some((answer) => answer.playerId === item.id),
  );
  updateRoom(roomCode, { answers: room.answers, status: allAnswered ? 'REVEAL' : 'ANSWERING' }, io);
}
function revealDone(roomCode, io, playerId) {
  const room = getRoom(roomCode);
  if (!room || room.status !== 'REVEAL' || (playerId !== undefined && !canHost(room, playerId)))
    return;
  updateRoom(roomCode, { status: 'DISCUSS_AND_VOTE' }, io);
}
function submitVote(roomCode, playerId, targetMemberId, io) {
  const room = getRoom(roomCode);
  if (!room || room.status !== 'DISCUSS_AND_VOTE') return;
  const players = room.players.filter((player) => !player.isDisplay);
  if (
    !players.some((player) => player.id === playerId) ||
    !players.some((player) => player.id === targetMemberId)
  )
    return;
  const existing = room.votes.find((vote) => vote.voterId === playerId);
  if (existing) existing.targetId = targetMemberId;
  else room.votes.push({ voterId: playerId, targetId: targetMemberId });
  updateRoom(roomCode, { votes: room.votes }, io);
  if (
    players.every((player) => room.votes.some((vote) => vote.voterId === player.id)) &&
    !timers.has(`${roomCode}-votes-lock`)
  ) {
    schedule(roomCode, 'votes-lock', 1500, () => {
      if (getRoom(roomCode)?.status !== 'DISCUSS_AND_VOTE') return;
      updateRoom(roomCode, { status: 'SCORE' }, io);
      schedule(roomCode, 'score', 300, () => calculateScores(roomCode, io));
    });
  }
}
function calculateScores(roomCode, io) {
  const room = getRoom(roomCode);
  if (!room || room.status !== 'SCORE' || !room.impostorId) return;
  const { leaderboard, pointsThisRound } = scoreRound(room);
  updateRoom(
    roomCode,
    {
      status: 'SUMMARY',
      leaderboard,
      pointsThisRound,
      verdictRevealsAt: Date.now() + pacing.verdictDelayMs,
    },
    io,
  );
}
function continueRound(roomCode, playerId, io) {
  const room = getRoom(roomCode);
  if (
    !room ||
    room.status !== 'SUMMARY' ||
    !canHost(room, playerId) ||
    Date.now() < (room.verdictRevealsAt ?? 0) + pacing.scoresDelayMs
  )
    return;
  if (room.currentRound >= room.totalRounds)
    return updateRoom(roomCode, { status: 'GAME_OVER' }, io);
  updateRoom(roomCode, { status: 'DISTRIBUTE_PROMPTS' }, io);
  schedule(roomCode, 'deal', 300, () => distributePrompts(roomCode, io));
}
function restartGame(roomCode, playerId, io) {
  const room = getRoom(roomCode);
  if (!room || !canHost(room, playerId)) return;
  ['deal', 'votes-lock', 'score'].forEach((key) => {
    const timerKey = `${roomCode}-${key}`;
    const timer = timers.get(timerKey);
    if (timer) clearTimeout(timer);
    timers.delete(timerKey);
  });
  resetPrompts(roomCode);
  updateRoom(
    roomCode,
    {
      status: 'LOBBY',
      currentRound: 0,
      answers: [],
      votes: [],
      impostorId: undefined,
      mainQuestion: undefined,
      leaderboard: Object.fromEntries(room.players.map((player) => [player.id, 0])),
      pointsThisRound: {},
      verdictRevealsAt: undefined,
    },
    io,
  );
}
module.exports = { startGame, submitAnswer, submitVote, revealDone, continueRound, restartGame };
