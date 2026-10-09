import { expect, test } from '@playwright/test';
import {
  expectColorClose,
  sampleCanvas,
} from '../../helpers/canvas-samples.js';
import { openScene, stepScene } from '../../helpers/open-scene.js';
import { canaryColors, Rgb8 } from '../canary-colors.js';
import type { CanarySceneHandle } from '../scenes/canary.js';

// Every message here starts the same way, so a canary failure reads as what
// it is: the rendering environment is wrong, and every golden and
// `@analytic` spec was skipped rather than failed.
const environmentFailure =
  'GOLDEN ENVIRONMENT FAILURE: the pinned rendering environment did not render the canary as expected, so every golden and @analytic spec was skipped. This is not caused by the change under test unless it changes the clear or a plain sprite. Check that the suite ran in the pinned Playwright image (`npm run test:golden`) as linux/amd64 with SwiftShader.';

const toExpected = ({ r, g, b }: Rgb8) => ({
  r: r / 255,
  g: g / 255,
  b: b / 255,
  a: 1,
});

test('environment canary: a clear and one opaque quad render exactly', async ({
  page,
}) => {
  await openScene(page, 'golden/canary');
  await stepScene(page, 1);

  const renderer = await page.evaluate(
    () => (window.__forgeTestHooks as unknown as CanarySceneHandle).renderer,
  );

  expect(
    renderer,
    `${environmentFailure} The renderer is "${renderer}".`,
  ).toContain('SwiftShader');

  const [background, quad] = await sampleCanvas(page, [
    { x: 0.1, y: 0.1 },
    { x: 0.5, y: 0.5 },
  ]);

  // Both colors are exact in 8 bits, so any difference at all is the
  // environment.
  const exact = 0.5 / 255;

  await test.step('clear color', () => {
    expectColorClose(
      background,
      toExpected(canaryColors.clear),
      exact,
      `${environmentFailure} The clear color`,
    );
  });

  await test.step('quad color', () => {
    expectColorClose(
      quad,
      toExpected(canaryColors.quad),
      exact,
      `${environmentFailure} The quad`,
    );
  });

  await test.step('golden', async () => {
    await expect(page.locator('canvas'), environmentFailure).toHaveScreenshot(
      'canary.png',
      { threshold: 0, maxDiffPixelRatio: 0 },
    );
  });
});
