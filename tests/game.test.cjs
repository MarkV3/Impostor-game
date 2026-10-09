const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const pacing = require('../shared/presentation.json');
const serverRoot = path.resolve(__dirname, '../server') + path.sep;
function setup(t, options = {}) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  for (const file of Object.keys(require.cache))
    if (file.startsWith(serverRoot)) delete require.cache[file];
  const rooms = require('../server/game/rooms.cjs');
  const game = require('../server/game/engine.cjs');
  const events = [];
  const io = {
    to: (target) => ({
      emit: (event, data) => events.push({ target, event, data: structuredClone(data) }),
    }),
  };
  const code = rooms.createRoom({ minPlayersToStart: 3, totalRounds: 2, ...options });
  const players = ['Alice', 'Bob', 'Charlie'].map((name, index) => ({
    id: `player-${index}`,
    name,
    isHost: index === 0,
    isDisplay: false,
  }));
  const display = { id: 'display', name: 'Display', isHost: false, isDisplay: true };
  [...players, display].forEach((player) => rooms.joinRoom(code, player, `socket-${player.id}`));
  const room = () => rooms.getRoom(code);
  const start = () => {
    game.startGame(code, display.id, io);
    t.mock.timers.tick(300);
  };
  const answer = () =>
    players.forEach((player) => game.submitAnswer(code, player.id, `${player.name}'s answer`, io));
  const vote = (target) => {
    game.revealDone(code, io, display.id);
    players.forEach((player) => game.submitVote(code, player.id, target, io));
    t.mock.timers.tick(1500);
    t.mock.timers.tick(300);
  };
  const continueRound = () => {
    t.mock.timers.tick(pacing.verdictDelayMs + pacing.scoresDelayMs);
    game.continueRound(code, display.id, io);
  };
  return {
    rooms,
    game,
    events,
    io,
    code,
    players,
    display,
    room,
    start,
    answer,
    vote,
    continueRound,
  };
}
test('rooms keep player and round bounds and ignore obsolete timer options', (t) => {
  const { rooms } = setup(t);
  const defaults = rooms.getRoom(rooms.createRoom());
  assert.match(defaults.code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  assert.equal(defaults.status, 'LOBBY');
  assert.equal(defaults.totalRounds, 6);
  assert.deepEqual(defaults.config, { minPlayersToStart: 4 });
  const bounded = rooms.getRoom(
    rooms.createRoom({
      minPlayersToStart: 1,
      totalRounds: 99,
      answeringSeconds: 1,
      votingSeconds: 999,
    }),
  );
  assert.equal(bounded.totalRounds, 10);
  assert.deepEqual(bounded.config, { minPlayersToStart: 3 });
});
test('joining, disconnecting, and host/display permissions are preserved', (t) => {
  const f = setup(t, { minPlayersToStart: 4 });
  f.game.startGame(f.code, f.players[1].id, f.io);
  assert.equal(f.room().status, 'LOBBY');
  assert.throws(() => f.game.startGame(f.code, f.display.id, f.io), /Need at least 4 players/);
  const result = f.rooms.removePlayer(f.players[1].id);
  assert.equal(result.roomCode, f.code);
  assert.equal(result.remaining.length, 3);
  assert.equal(f.rooms.getPlayerRoomCode(f.players[1].id), undefined);
  assert.equal(f.rooms.getSocketId(f.players[1].id), undefined);
  assert.throws(() => f.rooms.joinRoom('MISSING', f.players[1], 'socket'), /Room not found/);
});
test('one private impostor prompt is delivered and repeated start does not deal twice', (t) => {
  const f = setup(t);
  f.game.startGame(f.code, f.display.id, f.io);
  f.game.startGame(f.code, f.display.id, f.io);
  t.mock.timers.tick(299);
  assert.equal(f.room().status, 'DISTRIBUTE_PROMPTS');
  t.mock.timers.tick(1);
  const prompts = f.events.filter((event) => event.event === 'prompt:deliver');
  assert.equal(prompts.length, 3);
  assert.equal(prompts.filter((event) => event.data.role === 'impostor').length, 1);
  assert.equal(prompts.filter((event) => event.data.role === 'citizen').length, 2);
  assert.ok(prompts.every((event) => event.target !== 'socket-display'));
  assert.equal(f.room().currentRound, 1);
  assert.equal(f.room().answeringEndsAt, undefined);
  assert.throws(() => f.rooms.joinRoom(f.code, { id: 'late' }, 'socket-late'), /already started/);
});
test('answering has no deadline or placeholder answers, even after twelve hours', (t) => {
  const f = setup(t);
  f.start();
  f.game.submitAnswer(f.code, f.players[0].id, 'first', f.io);
  t.mock.timers.tick(12 * 60 * 60 * 1000);
  assert.equal(f.room().status, 'ANSWERING');
  assert.equal(f.room().answers.length, 1);
  f.answer();
  assert.equal(f.room().status, 'REVEAL');
});
test('answers are accepted once, exclude the display and blank input, and advance when all answer', (t) => {
  const f = setup(t);
  f.start();
  f.game.submitAnswer(f.code, f.display.id, 'display answer', f.io);
  f.game.submitAnswer(f.code, f.players[0].id, '   ', f.io);
  assert.equal(f.room().answers.length, 0);
  f.game.submitAnswer(f.code, f.players[0].id, ' first ', f.io);
  f.game.submitAnswer(f.code, f.players[0].id, 'replacement', f.io);
  assert.equal(f.room().answers[0].text, 'first');
  f.answer();
  assert.equal(f.room().answers.length, 3);
  assert.equal(f.room().status, 'REVEAL');
});
test('answer length is capped on the server as well as the phone', (t) => {
  const f = setup(t);
  f.start();
  f.game.submitAnswer(f.code, f.players[0].id, 'x'.repeat(300), f.io);
  assert.equal(f.room().answers[0].text.length, pacing.answerMaxLength);
});

test('paused reveals never time out and only the host/display can finish them', (t) => {
  const f = setup(t);
  f.start();
  f.answer();
  t.mock.timers.tick(12 * 60 * 60 * 1000);
  assert.equal(f.room().status, 'REVEAL');
  f.game.revealDone(f.code, f.io, f.players[1].id);
  assert.equal(f.room().status, 'REVEAL');
  f.game.revealDone(f.code, f.io, f.display.id);
  assert.equal(f.room().status, 'DISCUSS_AND_VOTE');
  f.game.revealDone(f.code, f.io, f.display.id);
  assert.equal(f.room().status, 'DISCUSS_AND_VOTE');
  assert.equal(f.room().votingEndsAt, undefined);
});
test('voting has no deadline and waits for the last player before its brief lock', (t) => {
  const f = setup(t);
  f.start();
  f.answer();
  f.game.revealDone(f.code, f.io, f.display.id);
  f.game.submitVote(f.code, f.players[0].id, f.players[1].id, f.io);
  f.game.submitVote(f.code, f.players[0].id, f.players[2].id, f.io);
  assert.deepEqual(f.room().votes, [{ voterId: f.players[0].id, targetId: f.players[2].id }]);
  f.game.submitVote(f.code, f.players[1].id, f.players[0].id, f.io);
  t.mock.timers.tick(12 * 60 * 60 * 1000);
  assert.equal(f.room().status, 'DISCUSS_AND_VOTE');
  f.game.submitVote(f.code, f.players[2].id, f.players[0].id, f.io);
  t.mock.timers.tick(1499);
  assert.equal(f.room().status, 'DISCUSS_AND_VOTE');
  t.mock.timers.tick(1);
  assert.equal(f.room().status, 'SCORE');
  t.mock.timers.tick(300);
  assert.equal(f.room().status, 'SUMMARY');
});
test('a strict majority catches the impostor and correct citizens earn one point', (t) => {
  const f = setup(t);
  f.start();
  f.answer();
  f.vote(f.room().impostorId);
  for (const player of f.players) {
    const expected = player.id === f.room().impostorId ? 0 : 1;
    assert.equal(f.room().pointsThisRound[player.id], expected);
    assert.equal(f.room().leaderboard[player.id], expected);
  }
  assert.equal(f.room().leaderboard[f.display.id], 0);
  assert.equal(f.room().verdictRevealsAt, Date.now() + pacing.verdictDelayMs);
});
test('changing a vote after everyone votes scores once and keeps the original lock time', (t) => {
  const f = setup(t);
  f.start();
  f.answer();
  f.game.revealDone(f.code, f.io, f.display.id);
  f.players.forEach((player) => f.game.submitVote(f.code, player.id, f.room().impostorId, f.io));
  t.mock.timers.tick(800);
  f.game.submitVote(f.code, f.players[0].id, f.room().impostorId, f.io);
  t.mock.timers.tick(700);
  assert.equal(f.room().status, 'SCORE');
  t.mock.timers.tick(300);
  const scores = { ...f.room().leaderboard };
  t.mock.timers.tick(1500);
  assert.deepEqual(f.room().leaderboard, scores);
  assert.equal(
    f.events.filter((event) => event.event === 'room:snapshot' && event.data.status === 'SUMMARY')
      .length,
    1,
  );
});
test('the impostor earns one point without a majority', (t) => {
  const f = setup(t);
  f.start();
  f.answer();
  const citizen = f.players.find((player) => player.id !== f.room().impostorId);
  f.game.revealDone(f.code, f.io, f.display.id);
  f.players.forEach((player) =>
    f.game.submitVote(
      f.code,
      player.id,
      player.id === citizen.id ? f.room().impostorId : citizen.id,
      f.io,
    ),
  );
  t.mock.timers.tick(1500);
  t.mock.timers.tick(300);
  assert.equal(f.room().pointsThisRound[f.room().impostorId], 1);
  assert.equal(f.room().pointsThisRound[citizen.id], 1);
});
test('a tied vote does not catch the impostor', (t) => {
  const f = setup(t);
  const fourth = { id: 'player-3', name: 'Dana', isHost: false, isDisplay: false };
  f.rooms.joinRoom(f.code, fourth, 'socket-fourth');
  f.players.push(fourth);
  f.start();
  f.answer();
  f.game.revealDone(f.code, f.io, f.display.id);
  const citizen = f.players.find((player) => player.id !== f.room().impostorId);
  f.players.forEach((player, index) =>
    f.game.submitVote(f.code, player.id, index < 2 ? f.room().impostorId : citizen.id, f.io),
  );
  t.mock.timers.tick(1500);
  t.mock.timers.tick(300);
  assert.equal(f.room().pointsThisRound[f.room().impostorId], 1);
});
test('results wait indefinitely and only the host can continue after the scores appear', (t) => {
  const f = setup(t);
  f.start();
  f.answer();
  f.vote(f.room().impostorId);
  f.game.continueRound(f.code, f.display.id, f.io);
  assert.equal(f.room().status, 'SUMMARY');
  t.mock.timers.tick(pacing.verdictDelayMs + pacing.scoresDelayMs - 1);
  f.game.continueRound(f.code, f.display.id, f.io);
  assert.equal(f.room().status, 'SUMMARY');
  t.mock.timers.tick(12 * 60 * 60 * 1000);
  assert.equal(f.room().status, 'SUMMARY');
  f.game.continueRound(f.code, f.players[1].id, f.io);
  assert.equal(f.room().status, 'SUMMARY');
  f.game.continueRound(f.code, f.players[0].id, f.io);
  assert.equal(f.room().status, 'DISTRIBUTE_PROMPTS');
  t.mock.timers.tick(300);
  assert.equal(f.room().currentRound, 2);
});
test('rounds use different prompts and the final results wait for host confirmation', (t) => {
  const f = setup(t);
  f.start();
  const firstQuestion = f.room().mainQuestion;
  f.answer();
  f.vote(f.room().impostorId);
  f.continueRound();
  t.mock.timers.tick(300);
  assert.equal(f.room().currentRound, 2);
  assert.notEqual(f.room().mainQuestion, firstQuestion);
  f.answer();
  f.vote(f.room().impostorId);
  t.mock.timers.tick(60000);
  assert.equal(f.room().status, 'SUMMARY');
  f.game.continueRound(f.code, f.display.id, f.io);
  assert.equal(f.room().status, 'GAME_OVER');
});
test('restart cancels pending deal, vote-lock, and score callbacks', (t) => {
  for (const phase of ['deal', 'lock', 'score']) {
    const f = setup(t);
    if (phase === 'deal') f.game.startGame(f.code, f.display.id, f.io);
    else {
      f.start();
      f.answer();
      f.game.revealDone(f.code, f.io, f.display.id);
      f.players.forEach((player) =>
        f.game.submitVote(f.code, player.id, f.room().impostorId, f.io),
      );
      if (phase === 'score') t.mock.timers.tick(1500);
    }
    f.game.restartGame(f.code, f.display.id, f.io);
    t.mock.timers.tick(2000);
    assert.equal(f.room().status, 'LOBBY');
    assert.ok(Object.values(f.room().leaderboard).every((score) => score === 0));
    t.mock.timers.reset();
  }
});
test('authorized restart clears scores and round progress but keeps the room', (t) => {
  const f = setup(t);
  f.start();
  f.answer();
  f.vote(f.room().impostorId);
  f.game.restartGame(f.code, f.players[1].id, f.io);
  assert.equal(f.room().status, 'SUMMARY');
  f.game.restartGame(f.code, f.display.id, f.io);
  assert.equal(f.room().status, 'LOBBY');
  assert.equal(f.room().currentRound, 0);
  assert.equal(f.room().players.length, 4);
  assert.deepEqual(f.room().answers, []);
  assert.deepEqual(f.room().votes, []);
  assert.equal(f.room().impostorId, undefined);
  assert.equal(f.room().verdictRevealsAt, undefined);
  t.mock.timers.tick(180000);
  assert.equal(f.room().status, 'LOBBY');
});
