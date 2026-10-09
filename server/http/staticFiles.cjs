const fs = require('node:fs');
const path = require('node:path');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function createStaticHandler(distDirectory) {
  const indexFile = path.join(distDirectory, 'index.html');
  const sendText = (req, res, status, message) => {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(req.method === 'HEAD' ? undefined : message);
  };

  return async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      sendText(req, res, 405, 'Method not allowed.');
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      sendText(req, res, 400, 'Invalid URL.');
      return;
    }

    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(
        req.method === 'HEAD'
          ? undefined
          : JSON.stringify({ ok: true, frontendReady: fs.existsSync(indexFile) }),
      );
      return;
    }

    const segments = pathname.split('/');
    if (
      pathname.includes('\\') ||
      pathname.includes(':') ||
      pathname.includes('\0') ||
      segments.some((segment) => segment.startsWith('.'))
    ) {
      sendText(req, res, 404, 'Not found.');
      return;
    }
    const file = path.resolve(distDirectory, '.' + pathname);
    if (!file.startsWith(distDirectory + path.sep) && file !== distDirectory) {
      sendText(req, res, 404, 'Not found.');
      return;
    }

    // Extensionless routes (including /host) belong to the browser application.
    const asset = path.extname(pathname) ? file : indexFile;
    try {
      const stat = await fs.promises.stat(asset);
      if (!stat.isFile()) {
        sendText(req, res, 404, 'Not found.');
        return;
      }
      res.writeHead(200, {
        'Content-Type': CONTENT_TYPES[path.extname(asset)] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': asset === indexFile ? 'no-cache' : 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const stream = fs.createReadStream(asset);
      stream.on('error', () => res.destroy());
      res.on('close', () => stream.destroy());
      stream.pipe(res);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        sendText(
          req,
          res,
          asset === indexFile ? 503 : 404,
          asset === indexFile ? 'Frontend build missing. Run npm run build first.' : 'Not found.',
        );
      } else {
        console.error('Failed to serve frontend:', error);
        sendText(req, res, 500, 'Unable to serve frontend.');
      }
    }
  };
}

module.exports = { createStaticHandler };
