import { expect, test } from '@playwright/test';
import type { PixelBounds } from '../fixtures/scenes/input-scene-helpers.js';
import type { TrimmedSpriteAnimationSceneHandle } from '../fixtures/scenes/trimmed-sprite-animation.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`; see `camera-pan-zoom.spec.ts` for why each spec narrows
// it inline instead of augmenting `Window`.
type Hooks = TrimmedSpriteAnimationSceneHandle;
type Page = import('@playwright/test').Page;

/**
 * Steps one frame of the clip and measures it in the same task - see
 * AGENTS.md's "Be wary of pixel-level rendering assertions".
 */
const captureFrame = (page: Page) =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step(scene.frameDurationMilliseconds);

    return {
      markers: scene.measureMarkerBounds(),
      frameIndices: scene.animatedFrameIndices,
      instancedDraws: [...scene.lastFrameInstancedDraws],
      spriteSpacingInWorldUnits: scene.spriteSpacingInWorldUnits,
      devicePixelsPerUnit: scene.devicePixelsPerUnit,
    };
  });

const shiftRight = (bounds: PixelBounds, distance: number): PixelBounds => ({
  left: bounds.left + distance,
  right: bounds.right + distance,
  top: bounds.top,
  bottom: bounds.bottom,
});

// Antialiasing and rounding the spacing to whole pixels can move an edge by
// a pixel or so; a trimmed frame drawn in the wrong place or stretched moves
// its marker by tens of pixels.
const edgeTolerance = 2;

const expectBoundsNear = (actual: PixelBounds, expected: PixelBounds) => {
  expect(Math.abs(actual.left - expected.left)).toBeLessThanOrEqual(
    edgeTolerance,
  );
  expect(Math.abs(actual.right - expected.right)).toBeLessThanOrEqual(
    edgeTolerance,
  );
  expect(Math.abs(actual.top - expected.top)).toBeLessThanOrEqual(
    edgeTolerance,
  );
  expect(Math.abs(actual.bottom - expected.bottom)).toBeLessThanOrEqual(
    edgeTolerance,
  );
};

test.describe('A sprite animation of trimmed frames', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the trimmed-sprite-animation scene', async () => {
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=trimmed-sprite-animation');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('keeps the art in place on every frame, in one batch', async ({
    page,
  }) => {
    const shownFrames = new Set<number>();

    // Two loops of the three-frame clip.
    for (let step = 0; step < 6; step++) {
      const frame = await test.step(`render clip frame ${step}`, () =>
        captureFrame(page));

      for (const index of frame.frameIndices) {
        shownFrames.add(index);
      }

      await test.step(`assert the markers line up on frame ${step}`, () => {
        const [reference, ...animated] = frame.markers;

        expect(reference).not.toBeNull();

        if (reference === null) {
          return;
        }

        const spacing =
          frame.spriteSpacingInWorldUnits * frame.devicePixelsPerUnit;

        for (const [index, bounds] of animated.entries()) {
          expect(bounds).not.toBeNull();

          if (bounds === null) {
            continue;
          }

          // Same place in the untrimmed frame as the reference sprite's
          // marker, and the same size: not moved, not stretched.
          expectBoundsNear(
            bounds,
            shiftRight(reference, spacing * (index + 1)),
          );
        }
      });

      await test.step(`assert one instanced draw on frame ${step}`, () => {
        expect(frame.instancedDraws).toEqual([3]);
      });
    }

    await test.step('assert the animated sprites showed every frame', () => {
      expect([...shownFrames].sort()).toEqual([0, 1, 2]);
    });
  });
});
