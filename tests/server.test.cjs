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

function receive(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, listener);
      reject(new Error(`Timed out waiting for ${event}`));
    }, 5000);
    const listener = (data) => {
      clearTimeout(timer);
      resolve(data);
    };
    socket.once(event, listener);
  });
}

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
