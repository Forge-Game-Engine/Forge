import { defineConfig, devices } from '@playwright/test';

// The golden-image and `@analytic` suite. It asserts absolute pixels, which
// only mean something in one pinned rendering environment, so it runs only
// inside the Playwright Docker image (`npm run test:golden`, see
// `scripts/golden/run-golden.mjs`), never against a host browser.

const port = 4300;

const chromium = {
  ...devices['Desktop Chrome'],
  deviceScaleFactor: 1,
  // Software (SwiftShader) WebGL2, the same flags as the normal suite. Its
  // output depends only on the SwiftShader build, which the image pins.
  launchOptions: {
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  },
};

export default defineConfig({
  outputDir: './golden-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A golden that only passes on a retry is flaky, and a flaky golden is a
  // failure: it would hide a real change on the run that happens to pass.
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: './golden-report', open: 'never' }],
  ],

  // One reference image per name, with no browser or platform suffix: the
  // images are only valid in the pinned image, so there is only ever one.
  snapshotPathTemplate: '{testDir}/../images/{arg}{ext}',

  // A missing golden fails instead of being written next to the others, so
  // goldens only ever come from `test:golden:update` in CI. The actual
  // image is still saved with the failure's results, to preview it.
  updateSnapshots: 'none',

  expect: {
    toHaveScreenshot: {
      // The default tolerance. A spec testing thin features (text, edges)
      // passes a looser one and says why.
      //
      // `threshold` is pixelmatch's: the largest allowed color distance is
      // proportional to its square, so `0.1` lets a grey move by about 26
      // of 255 levels, enough to hide a changed tone curve or color space.
      // `0.02` allows about 5 levels, room for rounding differences between
      // CPUs running the same SwiftShader build, and catches shading
      // changes.
      threshold: 0.02,
      maxDiffPixelRatio: 0.002,
      animations: 'disabled',
      caret: 'hide',
    },
  },

  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    video: 'off',
  },

  projects: [
    {
      // Runs first. If it fails, the environment is wrong (a different
      // rasterizer, a GL fallback), and every project that depends on it is
      // skipped instead of failing for a reason unrelated to the change.
      name: 'canary',
      testDir: './golden/specs',
      testMatch: 'canary.spec.ts',
      use: chromium,
    },
    {
      name: 'golden',
      testDir: './golden/specs',
      testIgnore: 'canary.spec.ts',
      dependencies: ['canary'],
      use: chromium,
    },
    {
      // Specs in the normal suite that compare pixels with computed values.
      // `test:e2e` skips them; they run here, behind the canary.
      name: 'analytic',
      testDir: './specs',
      grep: /@analytic/,
      dependencies: ['canary'],
      use: chromium,
    },
  ],

  webServer: {
    command:
      'node node_modules/vite/bin/vite.js --config vite.config.e2e.js --port 4300 --strictPort',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    cwd: '..',
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
