const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { once } = require('node:events');
const { test } = require('node:test');
const { io: connect } = require('socket.io-client');
const { createGameServer } = require('../server/app.cjs');
const { createStaticHandler } = require('../server/http/staticFiles.cjs');
const { getConfig } = require('../server/config.cjs');

async function serve(t, server, cleanup = () => {}) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise((resolve) => {
        cleanup();
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  return `http://127.0.0.1:${server.address().port}`;
}

function receive(socket, event, matches = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, listener);
      reject(new Error(`Timed out waiting for ${event}`));
    }, 5000);
    const listener = (data) => {
      if (!matches(data)) return;
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(data);
    };
    socket.on(event, listener);
  });
}

async function multiplayer(t) {
  const { httpServer, io } = createGameServer();
  const origin = await serve(t, httpServer, () => io.close());
  const open = async (token, { restore = false, prompt = false } = {}) => {
    const socket = connect(origin, {
      autoConnect: false,
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      auth: { sessionToken: token },
    });
    t.after(() => socket.disconnect());
    const assigned = receive(socket, 'assign:id');
    const session = receive(socket, 'assign:session');
    const snapshot = restore ? receive(socket, 'room:snapshot') : undefined;
    const privatePrompt = prompt ? receive(socket, 'prompt:deliver') : undefined;
    socket.connect();
    const [id, credentials, room, deliveredPrompt] = await Promise.all([
      assigned,
      session,
      snapshot,
      privatePrompt,
    ]);
    return { socket, id, token: credentials.token, room, prompt: deliveredPrompt };
  };
  const host = await open();
  const { code } = await host.socket
    .timeout(5000)
    .emitWithAck('room:create', { minPlayersToStart: 3, totalRounds: 2 });
  const join = async (client, name, role = 'player') => {
    const snapshot = receive(client.socket, 'room:snapshot');
    client.socket.emit('room:join', { code, name, role });
    return snapshot;
  };
  await join(host, 'Alice');
  const bob = await open();
  await join(bob, 'Bob');
  const charlie = await open();
  await join(charlie, 'Charlie');
  const drop = async (client) => {
    const disconnected = once(io.sockets.sockets.get(client.socket.id), 'disconnect');
    client.socket.io.engine.close();
    await disconnected;
  };
  return { io, code, host, bob, charlie, open, join, drop };
}

for (const playerCount of [3, 10]) {
  test(
    playerCount === 3
      ? 'the last two players can submit answers and votes together without losing their seats'
      : 'ten players can submit answers and rapidly change votes together without duplicate scoring',
    async (t) => {
      const f = await multiplayer(t);
      const { getRoom, getSocketId } = require('../server/game/rooms.cjs');
      const clients = [f.host, f.bob, f.charlie];
      while (clients.length < playerCount) {
        const client = await f.open();
        await f.join(client, `Player ${clients.length + 1}`);
        clients.push(client);
      }
      const ids = clients.map((client) => client.id).sort();
      const errors = [];
      const disconnects = [];
      const reassignments = [];
      const histories = clients.map(() => []);
      clients.forEach((client, index) => {
        client.socket.on('room:error', (error) => errors.push(error));
        client.socket.on('disconnect', (reason) => disconnects.push(reason));
        client.socket.on('assign:id', (id) => reassignments.push(id));
        client.socket.on('room:snapshot', (room) => histories[index].push(room));
      });
      const waitForAll = (matches) =>
        Promise.all(clients.map((client) => receive(client.socket, 'room:snapshot', matches)));

      // Send each burst synchronously through independent live WebSockets, without
      // waiting for another player's response. Repeat across fresh rounds to expose
      // leftover vote-lock/scoring callbacks as well as collisions at phase changes.
      for (let round = 0; round < 5; round++) {
        histories.forEach((history) => {
          history.length = 0;
        });
        const answering = waitForAll((room) => room.status === 'ANSWERING');
        f.host.socket.emit('room:start');
        const [dealt] = await answering;
        const expectedAnswers = clients.map((client, index) => ({
          playerId: client.id,
          text: `Round ${round}, player ${index}`.padEnd(80, 'x'),
        }));
        const submitters = playerCount === 3 ? clients.slice(1) : clients;
        if (playerCount === 3) {
          const first = waitForAll((room) => room.answers.length === 1);
          f.host.socket.emit('answer:submit', { text: expectedAnswers[0].text });
          await first;
        }
        const revealed = waitForAll((room) => room.status === 'REVEAL');
        for (let attempt = 0; attempt < 3; attempt++)
          for (const client of submitters)
            client.socket.emit('answer:submit', {
              text:
                attempt === 0
                  ? expectedAnswers.find((answer) => answer.playerId === client.id).text
                  : 'Repeated submission must not overwrite the original answer',
            });
        const reveals = await revealed;
        for (const room of reveals) {
          assert.equal(room.answers.length, playerCount);
          for (const expected of expectedAnswers)
            assert.equal(
              room.answers.find((answer) => answer.playerId === expected.playerId).text,
              expected.text,
            );
        }

        const voting = waitForAll((room) => room.status === 'DISCUSS_AND_VOTE');
        f.host.socket.emit('reveal:done');
        await voting;
        if (playerCount === 3) {
          const first = waitForAll((room) => room.votes.length === 1);
          f.host.socket.emit('vote:submit', { targetMemberId: dealt.impostorId });
          await first;
        }
        const summaries = waitForAll((room) => room.status === 'SUMMARY');
        const citizenId = clients.find((client) => client.id !== dealt.impostorId).id;
        for (let change = 0; change < 20; change++)
          for (const client of submitters)
            client.socket.emit('vote:submit', {
              targetMemberId: change % 2 === 0 ? citizenId : dealt.impostorId,
            });
        const results = await summaries;
        const leaderboard = Object.fromEntries(
          clients.map((client) => [client.id, client.id === dealt.impostorId ? 0 : 1]),
        );
        for (const room of results) {
          assert.equal(room.votes.length, playerCount);
          assert.equal(new Set(room.votes.map((vote) => vote.voterId)).size, playerCount);
          assert.ok(room.votes.every((vote) => vote.targetId === dealt.impostorId));
          assert.deepEqual(room.leaderboard, leaderboard);
          assert.deepEqual(room.pointsThisRound, leaderboard);
        }
        for (const history of histories) {
          assert.equal(history.filter((room) => room.status === 'REVEAL').length, 1);
          assert.equal(history.filter((room) => room.status === 'SCORE').length, 1);
          assert.equal(history.filter((room) => room.status === 'SUMMARY').length, 1);
          for (const room of history) {
            // Ignore lobby packets sent before the final test player joined.
            if (room.status === 'LOBBY') continue;
            assert.deepEqual(room.players.map((player) => player.id).sort(), ids);
            assert.equal(
              new Set(room.answers.map((answer) => answer.playerId)).size,
              room.answers.length,
            );
            assert.equal(new Set(room.votes.map((vote) => vote.voterId)).size, room.votes.length);
          }
        }
        for (const client of clients) {
          assert.equal(client.socket.connected, true);
          assert.equal(getSocketId(client.id), client.socket.id);
        }
        assert.deepEqual(getRoom(f.code).leaderboard, leaderboard);
        assert.deepEqual(errors, []);
        assert.deepEqual(disconnects, []);
        assert.deepEqual(reassignments, []);
        const reset = waitForAll((room) => room.status === 'LOBBY');
        f.host.socket.emit('room:restart');
        await reset;
      }
    },
  );
}

test('a transport drop keeps the player in the room and preserves host rights', async (t) => {
  const f = await multiplayer(t);
  const { getRoom, getSocketId } = require('../server/game/rooms.cjs');
  await f.drop(f.host);
  assert.equal(getRoom(f.code).players.length, 3);
  assert.equal(getRoom(f.code).players.find((player) => player.id === f.host.id)?.isHost, true);
  assert.equal(getSocketId(f.host.id), undefined);
  const resumed = await f.open(f.host.token, { restore: true });
  assert.equal(resumed.id, f.host.id);
  assert.equal(resumed.token, f.host.token);
  assert.equal(resumed.room.players.length, 3);
  assert.equal(resumed.room.players.find((player) => player.id === resumed.id).isHost, true);
});

test('reconnecting during answering restores the exact private prompt and accepted answer', async (t) => {
  const f = await multiplayer(t);
  const originalPrompt = receive(f.bob.socket, 'prompt:deliver');
  f.host.socket.emit('room:start');
  const prompt = await originalPrompt;
  const answered = receive(f.bob.socket, 'room:snapshot');
  f.bob.socket.emit('answer:submit', { text: 'A hammock' });
  const before = await answered;
  assert.equal(before.status, 'ANSWERING');
  assert.equal(before.answers[0].playerId, f.bob.id);
  await f.drop(f.bob);
  const resumed = await f.open(f.bob.token, { restore: true, prompt: true });
  assert.equal(resumed.id, f.bob.id);
  assert.deepEqual(resumed.prompt, prompt);
  assert.deepEqual(resumed.room.answers, before.answers);
  assert.deepEqual(resumed.room.leaderboard, before.leaderboard);
  const duplicate = receive(resumed.socket, 'room:snapshot');
  resumed.socket.emit('room:join', { code: f.code, name: 'Different', role: 'display' });
  const room = await duplicate;
  assert.equal(room.players.length, 3);
  assert.equal(room.players.find((player) => player.id === resumed.id).name, 'Bob');
  assert.equal(room.players.find((player) => player.id === resumed.id).isDisplay, false);
  // The resumed socket can still take actions; a repeated answer is rejected by the engine.
  resumed.socket.emit('answer:submit', { text: 'Duplicate' });
  const updated = receive(resumed.socket, 'room:snapshot');
  f.charlie.socket.emit('answer:submit', { text: 'A couch' });
  assert.deepEqual(
    (await updated).answers.filter((answer) => answer.playerId === resumed.id),
    before.answers,
  );
});

test('an offline player receives their prompt even when the round was dealt without them', async (t) => {
  const f = await multiplayer(t);
  await f.drop(f.bob);
  const dealt = receive(f.charlie.socket, 'prompt:deliver');
  f.host.socket.emit('room:start');
  await dealt;
  const resumed = await f.open(f.bob.token, { restore: true, prompt: true });
  assert.equal(resumed.room.status, 'ANSWERING');
  assert.equal(resumed.id, f.bob.id);
  assert.equal(resumed.prompt.role, resumed.room.impostorId === f.bob.id ? 'impostor' : 'citizen');
  assert.equal(typeof resumed.prompt.text, 'string');
  const updated = receive(resumed.socket, 'room:snapshot');
  resumed.socket.emit('answer:submit', { text: 'Back online' });
  assert.equal((await updated).answers[0].text, 'Back online');
});

test('several disconnected voters resume their votes and can finish the round', async (t) => {
  const f = await multiplayer(t);
  const dealt = receive(f.host.socket, 'prompt:deliver');
  f.host.socket.emit('room:start');
  await dealt;
  for (const client of [f.host, f.bob, f.charlie]) {
    const answered = receive(client.socket, 'room:snapshot', (room) =>
      room.answers.some((answer) => answer.playerId === client.id),
    );
    client.socket.emit('answer:submit', { text: client.id });
    await answered;
  }
  const voting = receive(
    f.host.socket,
    'room:snapshot',
    (room) => room.status === 'DISCUSS_AND_VOTE',
  );
  f.host.socket.emit('reveal:done');
  assert.equal((await voting).status, 'DISCUSS_AND_VOTE');
  const voted = receive(f.bob.socket, 'room:snapshot', (room) => room.votes.length === 1);
  f.bob.socket.emit('vote:submit', { targetMemberId: f.charlie.id });
  await voted;
  await Promise.all([f.drop(f.host), f.drop(f.bob)]);
  const host = await f.open(f.host.token, { restore: true, prompt: true });
  const bob = await f.open(f.bob.token, { restore: true, prompt: true });
  assert.equal(bob.room.status, 'DISCUSS_AND_VOTE');
  assert.deepEqual(bob.room.votes, [{ voterId: f.bob.id, targetId: f.charlie.id }]);
  const changed = receive(bob.socket, 'room:snapshot');
  bob.socket.emit('vote:submit', { targetMemberId: f.host.id });
  assert.deepEqual((await changed).votes, [{ voterId: f.bob.id, targetId: f.host.id }]);
  const summary = receive(host.socket, 'room:snapshot', (room) => room.status === 'SUMMARY');
  host.socket.emit('vote:submit', { targetMemberId: f.bob.id });
  f.charlie.socket.emit('vote:submit', { targetMemberId: f.bob.id });
  const room = await summary;
  assert.equal(room.players.length, 3);
  assert.equal(Object.keys(room.leaderboard).length, 3);
  await f.drop(bob);
  const results = await f.open(bob.token, { restore: true, prompt: true });
  assert.deepEqual(results.room.leaderboard, room.leaderboard);
});

test('a replacement connection survives the old socket closing and still receives future rounds', async (t) => {
  const f = await multiplayer(t);
  const { getSocketId } = require('../server/game/rooms.cjs');
  const oldClosed = receive(f.bob.socket, 'disconnect');
  const replacement = await f.open(f.bob.token, { restore: true });
  assert.equal(await oldClosed, 'io server disconnect');
  assert.equal(getSocketId(f.bob.id), replacement.socket.id);
  const dealt = receive(replacement.socket, 'prompt:deliver');
  f.host.socket.emit('room:start');
  assert.equal(typeof (await dealt).text, 'string');
});

test('a display resumes mid-game with permissions and repeated joins do not duplicate it', async (t) => {
  const f = await multiplayer(t);
  const display = await f.open();
  await f.join(display, 'Display', 'display');
  const dealt = receive(f.host.socket, 'prompt:deliver');
  display.socket.emit('room:start');
  await dealt;
  await f.drop(display);
  const resumed = await f.open(display.token, { restore: true });
  assert.equal(resumed.room.status, 'ANSWERING');
  assert.equal(resumed.room.players.find((player) => player.id === display.id).isDisplay, true);
  const rejoined = receive(resumed.socket, 'room:snapshot');
  resumed.socket.emit('room:join', { code: f.code, name: 'Display', role: 'display' });
  assert.equal((await rejoined).players.length, 4);
  const reset = receive(resumed.socket, 'room:snapshot');
  resumed.socket.emit('room:restart');
  assert.equal((await reset).status, 'LOBBY');
  await f.drop(f.bob);
  const bob = await f.open(f.bob.token, { restore: true });
  assert.equal(bob.room.status, 'LOBBY');
  assert.equal(require('../server/game/rooms.cjs').getPrivatePrompt(bob.id), undefined);
});

test('a player ID or forged token cannot resume someone else or join a running game', async (t) => {
  const f = await multiplayer(t);
  const impostor = await f.open(f.bob.id);
  assert.notEqual(impostor.id, f.bob.id);
  assert.notEqual(impostor.token, f.bob.token);
  const dealt = receive(f.host.socket, 'prompt:deliver');
  f.host.socket.emit('room:start');
  await dealt;
  const rejected = receive(impostor.socket, 'room:error');
  impostor.socket.emit('room:join', { code: f.code, name: 'Bob', role: 'player' });
  assert.match((await rejected).message, /already started/);
});

test('refreshing before joining does not invalidate the replacement session token', async (t) => {
  const f = await multiplayer(t);
  const visitor = await f.open();
  const closed = receive(visitor.socket, 'disconnect');
  const replacement = await f.open(visitor.token);
  assert.equal(await closed, 'io server disconnect');
  assert.equal(replacement.id, visitor.id);
  await f.join(replacement, 'Dana');
  await f.drop(replacement);
  const restored = await f.open(replacement.token, { restore: true });
  assert.equal(restored.id, visitor.id);
  assert.equal(restored.room.players.length, 4);
});

test('configuration keeps a single local origin and validates its port', () => {
  assert.equal(getConfig({}).port, 8080);
  assert.equal(getConfig({}).host, '127.0.0.1');
  assert.equal(getConfig({}).publicUrl, 'https://simpleapp.qzz.io');
  assert.equal(getConfig({ PORT: '9000' }).port, 9000);
  for (const PORT of ['0', '-1', '65536', 'not-a-number', '1.5']) {
    assert.throws(() => getConfig({ PORT }), /PORT must/);
  }
});

test('production serves host/player routes, local assets, and WebSockets together', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'impostor-built-'));
  fs.writeFileSync(
    path.join(directory, 'index.html'),
    '<!doctype html><script src="/app.js"></script>',
  );
  fs.writeFileSync(path.join(directory, 'app.js'), 'console.log("frontend asset");');
  t.after(() => {
    fs.unlinkSync(path.join(directory, 'index.html'));
    fs.unlinkSync(path.join(directory, 'app.js'));
    fs.rmdirSync(directory);
  });
  const { httpServer, io } = createGameServer({ ...getConfig(), distDirectory: directory });
  const origin = await serve(t, httpServer, () => io.close());
  const root = await fetch(origin);
  assert.equal(root.status, 200);
  const html = await root.text();
  assert.ok(!html.includes('cdn.tailwindcss.com'));
  assert.ok(!html.includes('importmap'));
  assert.equal(await (await fetch(origin + '/host')).text(), html);
  assert.deepEqual(await (await fetch(origin + '/health')).json(), {
    ok: true,
    frontendReady: true,
  });
  const assetPath = html.match(/src="([^"]+\.js)"/)[1];
  const asset = await fetch(origin + assetPath);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type'), /javascript/);
  assert.match(asset.headers.get('cache-control'), /immutable/);
  const head = await fetch(origin + assetPath, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  for (const route of [
    '/missing.js',
    '/.env',
    '/server/index.cjs',
    '/%2e%2e%5cpackage.json',
    '/C:%5cWindows%5cwin.ini',
  ]) {
    assert.equal((await fetch(origin + route)).status, 404, route);
  }
  assert.equal((await fetch(origin + '/%ZZ')).status, 400);
  assert.equal((await fetch(origin, { method: 'POST' })).status, 405);

  const socket = connect(origin, { autoConnect: false, transports: ['websocket'], forceNew: true });
  t.after(() => socket.disconnect());
  const assigned = receive(socket, 'assign:id');
  socket.connect();
  assert.equal(typeof (await assigned), 'string');
  const { code } = await socket
    .timeout(5000)
    .emitWithAck('room:create', { minPlayersToStart: 3, totalRounds: 2 });
  const joined = receive(socket, 'room:snapshot');
  socket.emit('room:join', { code, name: 'Alice', role: 'player' });
  const room = await joined;
  assert.equal(room.players[0].isHost, true);
  assert.equal(room.players[0].isDisplay, false);
  const rejected = receive(socket, 'room:error');
  socket.emit('room:start');
  assert.match((await rejected).message, /Need at least 3 players/);
  assert.equal((await fetch(origin + '/health')).status, 200);
});

test('missing production builds report an actionable error', async (t) => {
  const http = require('node:http');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'impostor-static-'));
  // This is a single, known empty directory created by this test.
  t.after(() => fs.rmdirSync(directory));
  const origin = await serve(t, http.createServer(createStaticHandler(directory)));
  const response = await fetch(origin + '/host');
  assert.equal(response.status, 503);
  assert.match(await response.text(), /npm run build/);
  assert.deepEqual(await (await fetch(origin + '/health')).json(), {
    ok: true,
    frontendReady: false,
  });
});
