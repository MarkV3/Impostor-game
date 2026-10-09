import { defineConfig } from '@playwright/test';

const publicRun = process.env.TEST_PUBLIC_DOMAIN === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: publicRun ? 'https://simpleapp.qzz.io' : 'http://127.0.0.1:8080',
    browserName: 'chromium',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: publicRun
    ? undefined
    : {
        command: 'node --env-file-if-exists=.env server/index.cjs',
        url: 'http://127.0.0.1:8080/health',
        reuseExistingServer: false,
      },
});
