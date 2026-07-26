import { defineConfig, devices } from '@playwright/test';

const port = 4300;

export default defineConfig({
  testDir: './specs',
  // Pinned relative to this config file, not the invoking shell's cwd, so
  // `npx playwright test --config e2e/playwright.config.ts` from the repo
  // root doesn't scatter a `test-results/` directory there instead.
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    // printSteps surfaces each test.step() as it starts/finishes, instead
    // of only a pass/fail line once the whole test completes - useful here
    // since a run spends most of its time waiting on the dev server to
    // boot and the browser to launch, with nothing else printed otherwise.
    ['list', { printSteps: true }],
    ['html', { outputFolder: './playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Headless Chromium has no GPU in CI, so WebGL2 needs a software
        // (SwiftShader) rasterizer explicitly enabled - without these flags
        // `canvas.getContext('webgl2')` returns null and every scene fails
        // to construct its RenderContext.
        launchOptions: {
          args: [
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
          ],
        },
      },
    },
  ],

  webServer: {
    command: 'npm run dev:e2e',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    cwd: '..',
    // Playwright silences the dev server's own output by default, which is
    // exactly the window where a run looks stuck: nothing prints until the
    // server responds or the (2-minute default) startup timeout gives up.
    // Piping it through shows Vite's own "ready in Xms" line, and any
    // startup error, live.
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
