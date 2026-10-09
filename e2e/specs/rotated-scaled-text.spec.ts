import { expect, Page, test } from '@playwright/test';
import type {
  InkBounds,
  RotatedScaledTextSceneHandle,
} from '../fixtures/scenes/rotated-scaled-text.js';

// See the note in camera-pan-zoom.spec.ts: `window.__forgeTestHooks` is
// declared globally by harness.ts, narrowed inline per spec.
type Hooks = RotatedScaledTextSceneHandle;

// Anti-aliased edges and pixel quantization move a measured edge by a pixel
// or two; a label whose glyphs each turned about their own centers misses
// its expected bounds by tens of pixels.
const tolerancePixels = 3;

/**
 * Turns and scales `bounds` about the entity's position (the world origin)
 * and returns the axis-aligned bounds of the result: where the label's ink
 * must land if it keeps its layout. The label's ink is three equal squares
 * on one baseline, so its convex hull is this rectangle and the rectangle's
 * turned corners are the ink's extreme points.
 * @param bounds - The unrotated, unscaled label's measured ink bounds.
 * @param radians - The rotation applied to the label.
 * @param scale - The scale applied to the label.
 * @returns The expected ink bounds.
 */
function transformBounds(
  bounds: InkBounds,
  radians: number,
  scale: { x: number; y: number },
): InkBounds {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const corners = [
    { x: bounds.left, y: bounds.bottom },
    { x: bounds.right, y: bounds.bottom },
    { x: bounds.right, y: bounds.top },
    { x: bounds.left, y: bounds.top },
  ].map(({ x, y }) => {
    const scaledX = x * scale.x;
    const scaledY = y * scale.y;

    return {
      x: scaledX * cos - scaledY * sin,
      y: scaledX * sin + scaledY * cos,
    };
  });

  return {
    left: Math.min(...corners.map(({ x }) => x)),
    right: Math.max(...corners.map(({ x }) => x)),
    bottom: Math.min(...corners.map(({ y }) => y)),
    top: Math.max(...corners.map(({ y }) => y)),
  };
}

function expectBoundsClose(actual: InkBounds, expected: InkBounds): void {
  expect(Math.abs(actual.left - expected.left)).toBeLessThanOrEqual(
    tolerancePixels,
  );
  expect(Math.abs(actual.right - expected.right)).toBeLessThanOrEqual(
    tolerancePixels,
  );
  expect(Math.abs(actual.bottom - expected.bottom)).toBeLessThanOrEqual(
    tolerancePixels,
  );
  expect(Math.abs(actual.top - expected.top)).toBeLessThanOrEqual(
    tolerancePixels,
  );
}

/**
 * Renders the label unrotated and unscaled, then with `radians` and
 * `scale`, measuring the ink after each frame in the same task.
 */
function measureBeforeAndAfter(
  page: Page,
  radians: number,
  scale: { x: number; y: number },
): Promise<{ before: InkBounds | null; after: InkBounds | null }> {
  return page.evaluate(
    ({ radians, scale }) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setRotation(0);
      scene.setScale(1, 1);
      scene.step();
      const before = scene.measureInkBounds();

      scene.setRotation(radians);
      scene.setScale(scale.x, scale.y);
      scene.step();
      const after = scene.measureInkBounds();

      return { before, after };
    },
    { radians, scale },
  );
}

test.describe('rotated and scaled text', () => {
  test.beforeEach(async ({ page }) => {
    let pageError: Error | undefined;

    page.once('pageerror', (error) => {
      pageError = error;
    });

    await page.goto('/?scene=rotated-scaled-text');

    try {
      await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
    } catch (timeoutError) {
      throw pageError ?? timeoutError;
    }
  });

  for (const degrees of [90, 30]) {
    test(`a label rotated ${degrees} degrees covers the unrotated label's ink bounds, rotated`, async ({
      page,
    }) => {
      const radians = (degrees * Math.PI) / 180;
      const unitScale = { x: 1, y: 1 };

      const { before, after } = await test.step('render and measure', () =>
        measureBeforeAndAfter(page, radians, unitScale));

      await test.step('compare against the rotated unrotated bounds', () => {
        expect(before).not.toBeNull();
        expect(after).not.toBeNull();

        if (!before || !after) {
          return;
        }

        // Sanity check: the unrotated label is a wide line, so rotating it
        // changes its bounds visibly.
        expect(before.right - before.left).toBeGreaterThan(
          (before.top - before.bottom) * 3,
        );

        expectBoundsClose(after, transformBounds(before, radians, unitScale));
      });
    });
  }

  test("a scaled label covers the unscaled label's ink bounds, scaled", async ({
    page,
  }) => {
    const scale = { x: 2, y: 1.5 };

    const { before, after } = await test.step('render and measure', () =>
      measureBeforeAndAfter(page, 0, scale));

    await test.step('compare against the scaled unscaled bounds', () => {
      expect(before).not.toBeNull();
      expect(after).not.toBeNull();

      if (!before || !after) {
        return;
      }

      expectBoundsClose(after, transformBounds(before, 0, scale));
    });
  });
});
