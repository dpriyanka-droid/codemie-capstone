import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 8123);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const isCI = !!process.env.CI;

// Chromium only by default (fast CI). Set E2E_ALL_BROWSERS=1 to also run Firefox and WebKit.
const uiBrowsers = [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }];
if (process.env.E2E_ALL_BROWSERS) {
  uiBrowsers.push(
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  );
}

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results/artifacts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // The app uses one shared SQLite database, and tests clean it between runs, so run serially.
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ...(isCI ? [['github'] as ['github']] : []),
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'api', testMatch: /.*\.api\.spec\.ts/ },
    ...uiBrowsers.map((browser) => ({ ...browser, testMatch: /.*\.ui\.spec\.ts/ })),
  ],
  // Always start our own server on a dedicated port with a temp database (never reuse a dev
  // server, because the tests delete every book they find).
  webServer: {
    command: `${process.env.E2E_PYTHON ?? 'python'} tests/e2e/serve_e2e.py`,
    url: `${BASE_URL}/api/books`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { E2E_PORT: String(PORT) },
  },
});
