import { spawn } from 'node:child_process';
import { cloudflaredCommand, tunnelEnvironment, tunnelArguments } from './cloudflared.mjs';

if (!process.env.CLOUDFLARE_TUNNEL_TOKEN) {
  console.error(
    'Cloudflare token missing. Run npm run configure:tunnel, then follow docs/hosting.md.',
  );
  process.exit(1);
}

const tunnel = spawn(cloudflaredCommand(), tunnelArguments(), {
  stdio: 'inherit',
  env: tunnelEnvironment(),
  windowsHide: true,
});
tunnel.on('error', (error) => {
  console.error(
    error.code === 'ENOENT' ? 'Connector missing. Run npm run setup:tunnel first.' : error.message,
  );
  process.exitCode = 1;
});
tunnel.on('exit', (code) => {
  process.exitCode = code === 0 ? 0 : 1;
});
process.on('SIGINT', () => tunnel.kill());
process.on('SIGTERM', () => tunnel.kill());
