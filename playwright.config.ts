import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4330',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [{
    command: 'npm run preview -- --host 127.0.0.1 --port 4330 --ignore-lock',
    url: 'http://127.0.0.1:4330/en/',
    reuseExistingServer: false,
  }, {
    command: 'node scripts/serve-qa-fixtures.mjs',
    url: 'http://127.0.0.1:4331/en/',
    reuseExistingServer: false,
    timeout: 120_000,
  }, {
    // The real admin Worker over loopback, with GitHub mocked and a generated
    // Access token. Not an auth bypass: every signature and claim check runs.
    command: 'node --experimental-strip-types scripts/serve-admin-fixture.ts',
    url: 'http://127.0.0.1:4332/panel.css',
    reuseExistingServer: false,
    timeout: 60_000,
  }],
});
