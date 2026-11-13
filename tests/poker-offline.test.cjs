const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function worker() {
  const listeners = {};
  const data = new Map();
  let network = true;
  let claimed = false;
  let skipped = false;
  const key = (request) => (typeof request === 'string' ? request : request.url);
  const cache = {
    async addAll(requests) {
      for (const request of requests) data.set(key(request), new Response('cached shell'));
    },
    async put(request, response) {
      data.set(key(request), response);
    },
    async match(request) {
      return data.get(key(request))?.clone();
    },
  };
  const deleted = [];
  class BrowserRequest {
    constructor(url) {
      this.url = new URL(url, 'https://example.com').href;
    }
  }
  const context = {
    setTimeout,
    clearTimeout,
    URL,
    Request: BrowserRequest,
    Response,
    self: {
      location: { origin: 'https://example.com' },
      clients: {
        async claim() {
          claimed = true;
        },
      },
      skipWaiting() {
        skipped = true;
      },
      addEventListener(name, listener) {
        listeners[name] = listener;
      },
    },
    caches: {
      async open() {
        return cache;
      },
      async keys() {
        return ['holdem-practice-old', 'holdem-practice-v1', 'unrelated-app'];
      },
      async delete(name) {
        deleted.push(name);
        return true;
      },
    },
    async fetch() {
      if (!network) throw new Error('Offline');
      return new Response('latest trainer');
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/poker/sw.js'), 'utf8'), context);
  const lifecycle = async (name) => {
    let work;
    listeners[name]({
      waitUntil(promise) {
        work = promise;
      },
    });
    await work;
  };
  const request = (url, method = 'GET') => {
    let response;
    listeners.fetch({
      request: { url: new URL(url, 'https://example.com').href, method },
      waitUntil() {},
      respondWith(promise) {
        response = promise;
      },
    });
    return response;
  };
  return {
    lifecycle,
    request,
    listeners,
    deleted,
    data,
    offline() {
      network = false;
    },
    claimed: () => claimed,
    skipped: () => skipped,
  };
}

test('offline shell includes all installation files and works after a network visit', async () => {
  const w = worker();
  await w.lifecycle('install');
  for (const file of [
    '/poker/',
    '/poker/index.html',
    '/poker/install.js',
    '/poker/manifest.webmanifest',
    '/poker/icon-192.png',
    '/poker/icon-512.png',
  ]) {
    assert.ok(w.data.has('https://example.com' + file), file);
  }
  assert.equal(await (await w.request('/poker/')).text(), 'latest trainer');
  w.offline();
  assert.equal(await (await w.request('/poker/')).text(), 'latest trainer');
  assert.equal(await (await w.request('/poker/install.js')).text(), 'cached shell');
});

test('worker is isolated from party-game traffic and deletes only its own old caches', async () => {
  const w = worker();
  for (const url of [
    '/',
    '/apps/',
    '/host',
    '/health',
    '/socket.io/',
    '/poker/unknown',
    'https://other.example/poker/',
  ])
    assert.equal(w.request(url), undefined, url);
  assert.equal(w.request('/poker/', 'POST'), undefined);
  await w.lifecycle('activate');
  assert.equal(w.claimed(), true);
  assert.deepEqual(w.deleted, ['holdem-practice-old']);
  assert.equal(w.skipped(), false);
  w.listeners.message({ data: { type: 'ACTIVATE_UPDATE' } });
  assert.equal(w.skipped(), true);
});
