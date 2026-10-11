import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { getConfig } from '../server/config.cjs';

const { publicUrl } = getConfig();
const sockets = [];
let display;
let latestRoom;

function receive(socket, event, accept = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, listener);
      reject(
        new Error(`Timed out waiting for ${event}. Check the deployment and WebSocket connection.`),
      );
    }, 20_000);
    const listener = (data) => {
      if (!accept(data)) return;
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(data);
    };
    socket.on(event, listener);
  });
}

async function connect() {
  const socket = io(publicUrl, {
    autoConnect: false,
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
  sockets.push(socket);
  const assigned = receive(socket, 'assign:id');
  socket.connect();
  const id = await assigned;
  return { socket, id };
}

async function get(route) {
  const response = await fetch(publicUrl + route, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    const body = await response.text();
    if (body.includes('1033'))
      throw new Error('Cloudflare error 1033: start the configured connector with npm run host.');
    throw new Error(
      `Public ${route || '/'} returned HTTP ${response.status}. Check docs/render.md or docs/hosting.md.`,
    );
  }
  return response;
}

try {
  console.log(`Checking ${publicUrl}...`);
  const health = await (await get('/health')).json();
  assert.equal(health.ok, true);
  assert.equal(health.frontendReady, true);
  const html = await (await get('/host')).text();
  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1]);
  assert.ok(assets.length >= 2, 'Expected locally built JavaScript and CSS assets.');
  for (const asset of assets) {
    assert.equal(new URL(asset, publicUrl).origin, publicUrl, 'Assets must use the public domain.');
    await get(asset);
  }
  const host = await connect();
  display = host.socket;
  display.on('room:snapshot', (room) => {
    latestRoom = room;
  });
  const { code } = await display.timeout(10_000).emitWithAck('room:create', {
    minPlayersToStart: 3,
    totalRounds: 2,
  });
  let snapshot = receive(display, 'room:snapshot');
  display.emit('room:join', { code, name: 'ConnectionCheck', role: 'display' });
  await snapshot;
  const players = [];
  for (let index = 0; index < 3; index++) {
    const player = await connect();
    snapshot = receive(
      display,
      'room:snapshot',
      (room) => room.players.filter((member) => !member.isDisplay).length === index + 1,
    );
    player.socket.emit('room:join', { code, name: `Check${index + 1}`, role: 'player' });
    await snapshot;
    players.push(player);
  }
  const prompts = players.map((player) => receive(player.socket, 'prompt:deliver'));
  snapshot = receive(display, 'room:snapshot', (room) => room.status === 'ANSWERING');
  display.emit('room:start');
  const answering = await snapshot;
  const delivered = await Promise.all(prompts);
  assert.equal(delivered.filter((prompt) => prompt.role === 'impostor').length, 1);
  snapshot = receive(display, 'room:snapshot', (room) => room.status === 'REVEAL');
  players.forEach((player) => player.socket.emit('answer:submit', { text: 'Connection check' }));
  await snapshot;
  snapshot = receive(display, 'room:snapshot', (room) => room.status === 'DISCUSS_AND_VOTE');
  display.emit('reveal:done');
  await snapshot;
  snapshot = receive(display, 'room:snapshot', (room) => room.status === 'SUMMARY');
  players.forEach((player) =>
    player.socket.emit('vote:submit', {
      targetMemberId:
        player.id === answering.impostorId
          ? players.find((other) => other.id !== player.id).id
          : answering.impostorId,
    }),
  );
  const summary = await snapshot;
  assert.equal(summary.pointsThisRound[answering.impostorId], 0);
  console.log(
    'Public pages, assets, WebSockets, three players, answering, voting, and scoring verified.',
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  // Reset our test room so no phase timer remains running after the check.
  if (display?.connected && latestRoom) {
    const reset = receive(display, 'room:snapshot', (room) => room.status === 'LOBBY');
    display.emit('room:restart');
    await reset.catch(() => {});
  }
  sockets.forEach((socket) => socket.disconnect());
}
