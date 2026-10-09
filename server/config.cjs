const path = require('node:path');

const PUBLIC_URL = 'https://simpleapp.qzz.io';

function getConfig(env = process.env) {
  const port = Number(env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return {
    port,
    host: '127.0.0.1',
    publicUrl: PUBLIC_URL,
    distDirectory: path.resolve(__dirname, '../dist'),
  };
}

module.exports = { getConfig };
