import { defineConfig, devices } from '@playwright/test'

/**
 * Visual regression tests: screenshots of the playground (built and served
 * with `vite preview`) compared with committed baselines, in Chromium; the
 * edge cases, axe and export checks also run in Firefox and WebKit.
 *
 * Screenshots depend on the platform's fonts and rendering, so the baselines
 * that count are the Linux ones, made in the Playwright Docker image (CI, see
 * .github/workflows/visual.yml, run by hand with "update snapshots" after an
 * intended change). Runs elsewhere keep their own, untracked baselines under
 * their platform's folder.
 */
export default defineConfig({
  testDir: 'tests/visual',
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173',
    // 1024 px wide: the gallery's two columns land on whole pixels, so a card
    // renders the same in either column.
    viewport: { width: 1024, height: 900 },
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'light',
  },
  expect: {
    toHaveScreenshot: {
      // Entrance animations and transitions are finished before every shot.
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.002,
    },
  },
  webServer: {
    command:
      'pnpm docs:build && pnpm --filter @tabler/charts-docs preview --port 4173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'chromium' },
    // Firefox and Safari's engine run the checks that are not pixel baselines of
    // the page (edge cases, axe, export), with export baselines of their own.
    ...(['firefox', 'webkit'] as const).map((name) => ({
      name,
      testMatch: /(cases|a11y|export|environments|csp|transitions|lifecycle|patterns)\.spec\.ts/,
      snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}',
      use: {
        ...devices[name === 'firefox' ? 'Desktop Firefox' : 'Desktop Safari'],
        viewport: { width: 1024, height: 900 },
        deviceScaleFactor: 1,
      },
    })),
  ],
})
