const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { createStaticHandler } = require('../server/http/staticFiles.cjs');

test('independent apps resolve correctly, support installation, and revalidate updates', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'impostor-apps-'));
  fs.cpSync(path.join(__dirname, '../public'), directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), '<title>Party game</title>');
  const server = http.createServer(createStaticHandler(directory));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/poker', '/apps']) {
    const response = await fetch(origin + route, { redirect: 'manual' });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), route + '/');
  }
  for (const route of ['/poker/', '/poker/index.html']) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    assert.match(await response.text(), /Hold’em Practice Desk/);
  }
  const hub = await (await fetch(origin + '/apps/')).text();
  assert.match(hub, /href="\/poker\/"/);
  assert.match(hub, /href="\/host"/);
  const manifestResponse = await fetch(origin + '/poker/manifest.webmanifest');
  assert.match(manifestResponse.headers.get('content-type'), /application\/manifest\+json/);
  const manifest = await manifestResponse.json();
  assert.equal(manifest.scope, '/poker/');
  assert.equal(manifest.start_url, '/poker/');
  for (const asset of [
    '/poker/sw.js',
    '/poker/install.js',
    '/poker/icon-192.png',
    '/poker/icon-512.png',
  ]) {
    const response = await fetch(origin + asset);
    assert.equal(response.status, 200, asset);
    assert.equal(response.headers.get('cache-control'), 'no-cache');
  }
  const head = await fetch(origin + '/poker/', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal(await (await fetch(origin + '/host')).text(), '<title>Party game</title>');
  assert.equal((await fetch(origin + '/poker/missing')).status, 404);
  assert.equal((await fetch(origin + '/apps/missing')).status, 404);
});
