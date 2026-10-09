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
  console.log(
    'Cloudflare must route this hostname to http://' + config.host + ':' + config.port + '.',
  );
});

function shutdown() {
  io.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
