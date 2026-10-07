import { expect, test } from '@playwright/test';
import type {
  MaskRevealMeasurement,
  MaskRevealSceneHandle,
} from '../fixtures/scenes/mask-reveal.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`; see `camera-pan-zoom.spec.ts` for why each spec narrows
// it inline instead of augmenting `Window`.
type Hooks = MaskRevealSceneHandle;
type Page = import('@playwright/test').Page;

interface MaskSettings {
  ringAmount?: number;
  ringRotation?: number;
  barAmount?: number;
}

/**
 * Applies `settings`, steps a frame and measures it in the same task - see
 * AGENTS.md's "Be wary of pixel-level rendering assertions".
 */
const captureFrame = (
  page: Page,
  settings: MaskSettings,
): Promise<{
  measurement: MaskRevealMeasurement;
  devicePixelsPerUnit: number;
  sizes: Hooks['sizes'];
}> =>
  page.evaluate((maskSettings) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.setRingAmount(maskSettings.ringAmount ?? 1);
    scene.setRingRotation(maskSettings.ringRotation ?? 0);
    scene.setBarAmount(maskSettings.barAmount ?? 1);
    scene.step();

    return {
      measurement: scene.measure(),
      devicePixelsPerUnit: scene.devicePixelsPerUnit,
      sizes: scene.sizes,
    };
  }, settings);

const ringTotal = ({ ringQuadrants }: MaskRevealMeasurement): number =>
  ringQuadrants.topLeft +
  ringQuadrants.topRight +
  ringQuadrants.bottomLeft +
  ringQuadrants.bottomRight;

test.describe('Masks', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the mask-reveal scene', async () => {
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=mask-reveal');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('a radial mask at 0.5 draws half the ring', async ({ page }) => {
    const full = await captureFrame(page, { ringAmount: 1 });
    const half = await captureFrame(page, { ringAmount: 0.5 });
    const fullCount = ringTotal(full.measurement);

    expect(fullCount, 'the full ring should be visible').toBeGreaterThan(1000);
    expect(ringTotal(half.measurement) / fullCount).toBeCloseTo(0.5, 1);

    // Clockwise from the top, the first half of the turn is the right half.
    const { ringQuadrants } = half.measurement;

    expect(ringQuadrants.topLeft + ringQuadrants.bottomLeft).toBeLessThan(
      fullCount * 0.02,
    );
  });

  test('a radial mask follows its entity rotation', async ({ page }) => {
    const full = await captureFrame(page, { ringAmount: 1 });
    const quarter = await captureFrame(page, {
      ringAmount: 0.25,
      ringRotation: Math.PI / 2,
    });
    const fullCount = ringTotal(full.measurement);
    const { ringQuadrants } = quarter.measurement;

    // Unrotated, a quarter clockwise from the top is the top-right
    // quadrant; turned a quarter counter-clockwise, it's the top-left.
    expect(ringQuadrants.topLeft / fullCount).toBeCloseTo(0.25, 1);
    expect(
      ringQuadrants.topRight +
        ringQuadrants.bottomLeft +
        ringQuadrants.bottomRight,
    ).toBeLessThan(fullCount * 0.02);
  });

  test('a linear mask reveals its amount of the bar', async ({ page }) => {
    const full = await captureFrame(page, { barAmount: 1 });
    const partial = await captureFrame(page, { barAmount: 0.3 });
    const empty = await captureFrame(page, { barAmount: 0 });

    expect(full.measurement.barWidth).toBeGreaterThan(0);
    expect(
      Math.abs(partial.measurement.barWidth / full.measurement.barWidth - 0.3),
    ).toBeLessThan(0.02);
    expect(empty.measurement.barWidth).toBe(0);
  });

  test("a rect mask clips its descendants to the mask's rect", async ({
    page,
  }) => {
    const { measurement, devicePixelsPerUnit, sizes } = await captureFrame(
      page,
      {},
    );

    expect(sizes.clippedChild).toBeGreaterThan(sizes.clip);
    expect(
      Math.abs(
        measurement.clippedChildWidth - sizes.clip * devicePixelsPerUnit,
      ),
    ).toBeLessThanOrEqual(2);
  });
});
