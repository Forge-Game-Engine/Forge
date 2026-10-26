import { expect, test } from '@playwright/test';
import type {
  BodyState,
  TransformInterpolationSceneHandle,
} from '../fixtures/scenes/transform-interpolation.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`. Each `page.evaluate` callback below narrows it to this
// spec's own scene handle type inline - see camera-pan-zoom.spec.ts's `Hooks`
// comment for why.
type Hooks = TransformInterpolationSceneHandle;
type Page = import('@playwright/test').Page;

// Four frames per 31.25 ms fixed step, like a 128 Hz display with a 32 Hz
// step. Both are exact in binary, so the steps land on every fourth frame.
const frameMilliseconds = 1000 / 128;

interface Frame {
  interpolated: BodyState;
  stepped: BodyState;
  interpolatedCenterX: number | null;
  steppedCenterX: number | null;
}

const loadScene = async (page: Page): Promise<void> => {
  let pageError: Error | undefined;

  page.once('pageerror', (error) => {
    pageError = error;
  });

  await page.goto('/?scene=transform-interpolation');

  try {
    await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
  } catch (timeoutError) {
    throw pageError ?? timeoutError;
  }
};

const captureFrame = (page: Page): Promise<Frame> =>
  page.evaluate((delta) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step(delta);

    const bounds = scene.measureBounds();
    const centerX = (
      found: { left: number; right: number } | null,
    ): number | null =>
      found === null ? null : (found.left + found.right) / 2;

    return {
      interpolated: scene.interpolated,
      stepped: scene.stepped,
      interpolatedCenterX: centerX(bounds.interpolated),
      steppedCenterX: centerX(bounds.stepped),
    };
  }, frameMilliseconds);

// Spaces frames out in real time so the motion is watchable in the recorded
// video, following keyboard-input.spec.ts's `animateFrames`.
const frameSpacingMilliseconds = 60;

const differences = (values: number[]): number[] =>
  values.slice(1).map((value, i) => value - values[i]);

test.describe('transform interpolation', () => {
  test.beforeEach(async ({ page }) => {
    await loadScene(page);
  });

  test('moves an interpolated body evenly on every frame between fixed steps', async ({
    page,
  }) => {
    const frames: Frame[] = [];

    await test.step('run 12 frames of 7.8125 ms', async () => {
      for (let frame = 0; frame < 12; frame++) {
        // eslint-disable-next-line no-await-in-loop
        frames.push(await captureFrame(page));
        // eslint-disable-next-line no-await-in-loop, sonarjs/no-fixed-wait-in-tests
        await page.waitForTimeout(frameSpacingMilliseconds);
      }
    });

    // Frames 4 to 12: the first fixed step runs on frame 4.
    const measured = frames.slice(3);

    for (const frame of measured) {
      expect(frame.interpolatedCenterX).not.toBeNull();
      expect(frame.steppedCenterX).not.toBeNull();
    }

    await test.step('assert the interpolated body moves about 4 px every frame', () => {
      const steps = differences(
        measured.map((frame) => frame.interpolatedCenterX!),
      );

      expect(steps).toHaveLength(8);

      for (const step of steps) {
        expect(Math.abs(step - 4)).toBeLessThanOrEqual(1);
      }
    });

    await test.step('assert the other body moves 16 px on one frame in four', () => {
      // The same-run control: the measurement sees uneven steps when the
      // body isn't interpolated.
      const steps = differences(measured.map((frame) => frame.steppedCenterX!));

      steps.forEach((step, i) => {
        const isStepFrame = (i + 1) % 4 === 0;

        expect(Math.abs(step - (isStepFrame ? 16 : 0))).toBeLessThanOrEqual(1);
      });
    });

    await test.step("assert the canvas shows the frame's transform pass", () => {
      const first = measured[0];
      const last = measured[measured.length - 1];
      const onScreenMove =
        last.interpolatedCenterX! - first.interpolatedCenterX!;
      const drawnMove = last.interpolated.worldX - first.interpolated.worldX;

      expect(Math.abs(onScreenMove - drawnMove)).toBeLessThan(2);

      // Frame 5 has an overstep fraction of 0.25 after a step: drawn a
      // whole step (16) behind the simulation, plus a quarter of the next.
      const frameFive = frames[4];

      expect(
        frameFive.interpolated.localX - frameFive.interpolated.worldX,
      ).toBe(12);
    });
  });
});
