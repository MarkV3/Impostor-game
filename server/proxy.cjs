// Simple reverse proxy to serve a single public URL.
// Routes `/socket.io` (including websockets) to the Socket.IO server (3001)
// and everything else to the Vite dev server (5173).

const http = require('http');
const httpProxy = require('http-proxy');
const url = require('url');

const PROXY_PORT = Number(process.env.PROXY_PORT || 8080);
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 5173);
const SOCKET_PORT = Number(process.env.SOCKET_PORT || 3001);

const socketTarget = `http://localhost:${SOCKET_PORT}`;
const frontendTarget = `http://localhost:${FRONTEND_PORT}`;

const proxy = httpProxy.createProxyServer({});

proxy.on('error', (err, req, res) => {
  const pathname = (url.parse(req.url).pathname) || '/';
  const target = pathname.startsWith('/socket.io') ? socketTarget : frontendTarget;
  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
  }
  res.end(`Proxy error: failed to reach ${target}. Ensure it is running.`);
});

const server = http.createServer((req, res) => {
  const pathname = (url.parse(req.url).pathname) || '/';
  if (pathname.startsWith('/socket.io')) {
    proxy.web(req, res, { target: socketTarget, changeOrigin: true, ws: true });
  } else {
    proxy.web(req, res, { target: frontendTarget, changeOrigin: true });
  }
});

server.on('upgrade', (req, socket, head) => {
  const pathname = (url.parse(req.url).pathname) || '/';
  if (pathname.startsWith('/socket.io')) {
    proxy.ws(req, socket, head, { target: socketTarget, changeOrigin: true });
  } else {
    proxy.ws(req, socket, head, { target: frontendTarget, changeOrigin: true });
  }
});

server.listen(PROXY_PORT, () => {
  console.log(`Reverse proxy listening on :${PROXY_PORT}`);
  console.log(`- Frontend → ${frontendTarget}`);
  console.log(`- Socket.IO → ${socketTarget}`);
});


