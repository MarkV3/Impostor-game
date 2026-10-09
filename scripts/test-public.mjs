import { spawn } from 'node:child_process';
import { projectRoot } from './cloudflared.mjs';

const tests = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], {
  cwd: projectRoot,
  env: { ...process.env, TEST_PUBLIC_DOMAIN: 'true' },
  stdio: 'inherit',
  windowsHide: true,
});
tests.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
tests.on('exit', (code) => {
  process.exitCode = code === 0 ? 0 : 1;
});
process.on('SIGINT', () => tests.kill());
process.on('SIGTERM', () => tests.kill());
