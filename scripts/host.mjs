import { spawn, spawnSync } from 'node:child_process';
import {
  cloudflaredCommand,
  projectRoot,
  tunnelEnvironment,
  tunnelArguments,
} from './cloudflared.mjs';

const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => {
    if (child.exitCode === null) child.kill();
  });
  process.exitCode = code;
}

function start(command, args, env = process.env) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
  children.push(child);
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => stop(code === 0 ? 0 : 1));
  return child;
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

try {
  const env = tunnelEnvironment();
  const connector = cloudflaredCommand();
  const version = spawnSync(connector, ['--version'], { stdio: 'ignore', windowsHide: true });
  if (version.error || version.status !== 0)
    throw new Error('Connector missing. Run npm run setup:tunnel first.');
  // Wait for this server's own listen event, not another process using its port.
  const server = spawn(process.execPath, ['--env-file-if-exists=.env', 'server/index.cjs'], {
    cwd: projectRoot,
    env: process.env,
    stdio: ['inherit', 'pipe', 'inherit'],
    windowsHide: true,
  });
  children.push(server);
  await new Promise((resolve, reject) => {
    let output = '';
    server.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      output += chunk;
      if (output.includes('Game server:')) resolve();
    });
    server.once('error', () => reject(new Error('Game server could not start.')));
    server.once('exit', () => reject(new Error('Game server stopped before startup.')));
  });
  server.on('exit', (code) => stop(code === 0 ? 0 : 1));
  if (!stopping) {
    start(connector, tunnelArguments(), env);
    console.log(
      'Game and Cloudflare connector started. Leave this terminal open; Ctrl+C stops both.',
    );
  }
} catch (error) {
  console.error(error.message);
  stop(1);
}
