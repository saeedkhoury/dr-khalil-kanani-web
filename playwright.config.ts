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
    command: 'ACK_UNVERIFIED=doctor.ar,doctor.en,tagline.ar npm run build:admin > /tmp/kanani-admin-e2e-build.log 2>&1 && node --experimental-strip-types scripts/serve-admin-fixture.ts',
    url: 'http://127.0.0.1:4332/panel.css',
    reuseExistingServer: false,
    timeout: 60_000,
  }, {
    // The same Worker configured as production (content branch 'main'), with
    // the official site's build.txt mocked: proves "Live" is claimed only
    // when the public site serves the saved commit. Serves the build above.
    command: 'node --experimental-strip-types scripts/serve-admin-fixture.ts --production',
    url: 'http://127.0.0.1:4333/panel.css',
    reuseExistingServer: false,
    timeout: 60_000,
  }],
});
