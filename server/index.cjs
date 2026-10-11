const { createGameServer } = require('./app.cjs');
const { getConfig } = require('./config.cjs');

const config = getConfig();
const { httpServer, io } = createGameServer(config);

httpServer.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? 'Port ' +
          config.port +
          ' is already in use. Stop the other game server or change PORT in .env.'
      : error.message,
  );
  process.exit(1);
});

httpServer.listen(config.port, config.host, () => {
  console.log('Game server: http://' + config.host + ':' + config.port);
  console.log('Public player URL: ' + config.publicUrl);
  console.log('Public host URL: ' + config.publicUrl + '/host');
  if (process.env.RENDER === 'true') {
    console.log('Render serves the game over HTTPS. No local Cloudflare connector is needed.');
  } else {
    console.log('For local public hosting, run npm run host to start the Cloudflare connector.');
  }
});

function shutdown() {
  io.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
