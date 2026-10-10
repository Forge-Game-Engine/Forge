import { expect, test } from '@playwright/test';
import type {
  DrawMeasurement,
  DrawSceneHandle,
  PaneMeasurement,
} from '../fixtures/scenes/gpu-device-draw.js';

type Hooks = DrawSceneHandle;
type Page = import('@playwright/test').Page;
type Rgba = readonly [number, number, number, number];

const distance = (a: Rgba, b: Rgba): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Steps one frame and measures it, in the same task. */
const drawAndMeasure = (page: Page): Promise<DrawMeasurement> =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    return scene.measure();
  });

/** Whether two panes show the same picture. */
const expectSamePane = (
  after: PaneMeasurement,
  before: PaneMeasurement,
): void => {
  expect(distance(after.overlap, before.overlap)).toBeLessThan(8);
  expect(distance(after.farOnly, before.farOnly)).toBeLessThan(8);
  expect(distance(after.background, before.background)).toBeLessThan(8);
  expect(
    Math.abs(after.blendedPixels - before.blendedPixels),
  ).toBeLessThanOrEqual(Math.max(4, before.blendedPixels * 0.1));
};

test.describe('GPU device draws', () => {
  test('draws an indexed, depth-tested, MSAA-resolved mesh into a texture through the encoder only', async ({
    page,
  }) => {
    const pageErrors: string[] = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/?scene=gpu-device-draw');
    await page.waitForFunction(() => window.__forgeTestHooks !== undefined);

    const { multisampled, singleSampled, noDepthTest } =
      await drawAndMeasure(page);

    for (const pane of [multisampled, singleSampled, noDepthTest]) {
      // Both quads and the clear color are drawn and distinct.
      expect(distance(pane.farOnly, pane.background)).toBeGreaterThan(100);
    }

    // With a depth test, the near quad drawn first stays in front of the far
    // one drawn after it...
    for (const pane of [multisampled, singleSampled]) {
      expect(distance(pane.overlap, pane.farOnly)).toBeGreaterThan(100);
    }

    // ...and without one, the far quad covers it, so the depth test is what
    // made the difference.
    expect(distance(noDepthTest.overlap, noDepthTest.farOnly)).toBeLessThan(8);
    expect(distance(multisampled.overlap, singleSampled.overlap)).toBeLessThan(
      8,
    );

    // The resolved 4x MSAA view has blended edge pixels; the single-sampled
    // view of the same mesh has (nearly) none.
    expect(multisampled.blendedPixels).toBeGreaterThan(
      4 * singleSampled.blendedPixels + 20,
    );
    expect(pageErrors).toEqual([]);
  });

  test('draws the same frame after the context is lost and restored', async ({
    page,
  }) => {
    const pageErrors: string[] = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/?scene=gpu-device-draw');
    await page.waitForFunction(() => window.__forgeTestHooks !== undefined);

    const before = await drawAndMeasure(page);

    await page.evaluate(() => {
      (window.__forgeTestHooks as unknown as Hooks).loseContext();
    });

    // Drawing and creating resources while lost does nothing and doesn't
    // throw.
    await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.createTextureWhileLost();
      scene.step();
      scene.restoreContext();
    });
    await page.waitForFunction(
      () => (window.__forgeTestHooks as unknown as Hooks).restoredCount() === 1,
    );

    const after = await drawAndMeasure(page);

    expectSamePane(after.multisampled, before.multisampled);
    expectSamePane(after.singleSampled, before.singleSampled);
    expectSamePane(after.noDepthTest, before.noDepthTest);

    // The texture written while the context was lost was uploaded when it
    // came back: it shows the near quad's green.
    expect(after.createdWhileLost).not.toBeNull();
    expect(
      distance(after.createdWhileLost!, before.multisampled.overlap),
    ).toBeLessThan(8);
    expect(pageErrors).toEqual([]);
  });
});
