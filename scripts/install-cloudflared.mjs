import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { localCloudflared, toolsDirectory } from './cloudflared.mjs';

try {
  if (process.platform !== 'win32' || !['x64', 'ia32'].includes(process.arch)) {
    throw new Error(
      'This installer supports Windows x64/x86. Use Cloudflare official downloads for your platform.',
    );
  }
  const releaseResponse = await fetch(
    'https://api.github.com/repos/cloudflare/cloudflared/releases/latest',
    {
      headers: { 'User-Agent': 'Impostor-game-setup' },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!releaseResponse.ok)
    throw new Error(`Cloudflare release lookup failed (HTTP ${releaseResponse.status}).`);
  const release = await releaseResponse.json();
  const assetName = `cloudflared-windows-${process.arch === 'x64' ? 'amd64' : '386'}.exe`;
  const asset = release.assets.find((item) => item.name === assetName);
  if (!asset?.digest?.startsWith('sha256:'))
    throw new Error('Official release has no SHA-256 digest for this download.');
  const expectedHash = asset.digest.slice('sha256:'.length);
  fs.mkdirSync(toolsDirectory, { recursive: true });
  if (fs.existsSync(localCloudflared)) {
    const installedHash = createHash('sha256')
      .update(fs.readFileSync(localCloudflared))
      .digest('hex');
    if (installedHash === expectedHash) {
      console.log(`cloudflared ${release.tag_name} is already installed and verified.`);
      process.exit(0);
    }
  }
  console.log(
    `Downloading official cloudflared ${release.tag_name} (${Math.round(asset.size / 1_000_000)} MB)...`,
  );
  const response = await fetch(asset.browser_download_url, {
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Download failed (HTTP ${response.status}).`);
  const binary = Buffer.from(await response.arrayBuffer());
  const actualHash = createHash('sha256').update(binary).digest('hex');
  if (actualHash !== expectedHash)
    throw new Error('Downloaded file does not match the official SHA-256 digest.');
  fs.writeFileSync(localCloudflared, binary);
  const version = spawnSync(localCloudflared, ['--version'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (version.error || version.status !== 0)
    throw new Error('Installed connector could not start.');
  console.log(version.stdout.trim());
  console.log(
    'Installed in .tools/cloudflared.exe. No administrator access or PATH changes are needed.',
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
