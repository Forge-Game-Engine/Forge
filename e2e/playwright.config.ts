import { defineConfig, devices } from '@playwright/test';

// Fires as soon as Node has finished loading Playwright itself and starts
// evaluating this config - the earliest point in the whole run we can print
// from. Compared against the `pretest:e2e` npm-script timestamp (printed the
// instant `npm run test:e2e` is invoked, before Node even starts requiring
// Playwright), the gap between the two brackets how much of a slow run is
// Playwright/Node startup itself vs. everything that happens after.
console.error(
  `[e2e] playwright.config.ts loaded at ${new Date().toISOString()}`,
);

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
  // CI runners have far fewer CPU cores than a dev machine, and SwiftShader
  // (the software GL rasterizer forced below, since there's no real GPU in
  // CI) is CPU-bound - two workers rendering concurrently there reproduced
  // a deterministic, whole-canvas-wrong-color rendering failure that never
  // happened locally with the same 2 workers. Serialize on CI to rule out
  // that contention; local keeps Playwright's own default parallelism.
  workers: process.env.CI ? 1 : undefined,
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
    // Full trace + video on every local run (not just failures) so a
    // developer can watch/replay what the browser actually did - `npx
    // playwright show-report e2e/playwright-report` opens both from any
    // run. CI only keeps them for failures, to avoid uploading a
    // trace/video per test on every green run.
    trace: process.env.CI ? 'retain-on-failure' : 'on',
    video: process.env.CI ? 'retain-on-failure' : 'on',
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
    // Invokes vite directly rather than `npm run dev:e2e`: each layer of
    // `npm run` spawns and initializes its own npm CLI process (reading
    // package.json, resolving the script, etc.) before it even gets to
    // exec'ing the real command, which is measurably slower on Windows/WSL
    // than a native Linux shell. `node <path>` (rather than the `.bin/vite`
    // shim) also sidesteps relying on the symlink's executable bit, which
    // is the more portable option across that same Windows/WSL boundary.
    command:
      'node node_modules/vite/bin/vite.js --config vite.config.e2e.js --port 4300 --strictPort',
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
