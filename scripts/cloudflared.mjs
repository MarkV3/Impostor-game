import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getConfig } from '../server/config.cjs';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const toolsDirectory = fileURLToPath(new URL('../.tools/', import.meta.url));
export const localCloudflared = fileURLToPath(
  new URL('../.tools/cloudflared.exe', import.meta.url),
);

export function cloudflaredCommand() {
  return process.platform === 'win32' && fs.existsSync(localCloudflared)
    ? localCloudflared
    : 'cloudflared';
}

export function tunnelEnvironment() {
  if (!process.env.CLOUDFLARE_TUNNEL_TOKEN?.trim()) {
    throw new Error(
      'Cloudflare token missing. Run npm run configure:tunnel, then follow docs/hosting.md.',
    );
  }
  // Pass only the standard secret variable that cloudflared knows to redact.
  const { CLOUDFLARE_TUNNEL_TOKEN, ...environment } = process.env;
  return { ...environment, TUNNEL_TOKEN: CLOUDFLARE_TUNNEL_TOKEN.trim() };
}

export function tunnelArguments() {
  const { publicUrl, host, port } = getConfig();
  const hostname = new URL(publicUrl).hostname;
  const configFile = fileURLToPath(new URL('../.tools/game-tunnel.yml', import.meta.url));
  fs.mkdirSync(toolsDirectory, { recursive: true });
  fs.writeFileSync(
    configFile,
    [
      '# Generated from server/config.cjs. Contains no credentials.',
      'ingress:',
      `  - hostname: ${JSON.stringify(hostname)}`,
      `    service: ${JSON.stringify(`http://${host}:${port}`)}`,
      '  - service: http_status:404',
      '',
    ].join('\n'),
  );
  return ['tunnel', '--config', configFile, '--protocol', 'http2', '--no-autoupdate', 'run'];
}
