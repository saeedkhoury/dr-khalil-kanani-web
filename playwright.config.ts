import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 3,
  // Every CMS save runs this suite before the public deploy. One retry in CI
  // keeps a timing-sensitive touch test from blocking the doctor's change;
  // a real regression fails twice. Locally, failures surface at once.
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Safari's engine for the admin (the doctor edits on an iPhone). Opt-in with
  // PW_WEBKIT=1 so the deploy gate's time and browser download do not grow.
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    ...(process.env.PW_WEBKIT ? [{
      name: 'webkit',
      use: { browserName: 'webkit' as const },
      testMatch: /(cms-journeys|visual-cms|admin|photo-publish|accessibility)\.spec\.ts/,
    }] : []),
  ],
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
