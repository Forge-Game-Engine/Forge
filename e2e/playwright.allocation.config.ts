import { defineConfig, devices } from '@playwright/test';

const port = 4300;

/**
 * The steady-state allocation specs (`e2e/allocation/`), kept apart from the
 * main suite: they run thousands of frames under V8's sampling heap
 * profiler, need their own V8 flag, and must not retry, since a spec that
 * passes only on a retry is a result that depends on chance.
 */
export default defineConfig({
  testDir: './allocation',
  outputDir: './test-results/allocation',
  // Several thousand frames per spec, plus the sampling profiler's overhead.
  timeout: 10 * 60 * 1000,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // One spec at a time, so specs don't compete for the CPU that SwiftShader
  // also rasterizes on.
  workers: 1,
  reporter: [
    ['list', { printSteps: true }],
    ['html', { outputFolder: './playwright-report/allocation', open: 'never' }],
  ],

  use: {
    baseURL: `http://127.0.0.1:${port}`,
    // A trace snapshots the page while it runs, which allocates in the page
    // and slows each frame; neither has anything to show here.
    trace: 'off',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            // See `playwright.config.ts`: WebGL2 through SwiftShader.
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
            // Samples at exactly every `samplingInterval` bytes rather than
            // at random intervals around it, so a run's result doesn't
            // depend on chance.
            '--js-flags=--sampling-heap-profiler-suppress-randomness',
          ],
        },
      },
    },
  ],

  webServer: {
    // The same dev server as `playwright.config.ts`.
    command:
      'node node_modules/vite/bin/vite.js --config vite.config.e2e.js --port 4300 --strictPort',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    cwd: '..',
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
