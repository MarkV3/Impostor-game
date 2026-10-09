const http = require('node:http');
const { Server } = require('socket.io');
const { getConfig } = require('./config.cjs');
const { createStaticHandler } = require('./http/staticFiles.cjs');
const { registerSocketHandlers } = require('./transport/socketHandlers.cjs');

function createGameServer(config = getConfig()) {
  const httpServer = http.createServer(createStaticHandler(config.distDirectory));
  const io = new Server(httpServer);
  registerSocketHandlers(io);
  return { httpServer, io };
}

module.exports = { createGameServer };
