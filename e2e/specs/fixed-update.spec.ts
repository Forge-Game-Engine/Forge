import { expect, test } from '@playwright/test';
import type { FixedUpdateSceneHandle } from '../fixtures/scenes/fixed-update.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`. Each `page.evaluate` callback below narrows it to this
// spec's own scene handle type inline - see camera-pan-zoom.spec.ts's `Hooks`
// comment for why.
type Hooks = FixedUpdateSceneHandle;
type Page = import('@playwright/test').Page;

const captureFrame = (page: Page, deltaMilliseconds: number) =>
  page.evaluate((delta) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step(delta);

    const bounds = scene.measureMoverBounds();

    return {
      moverX: scene.moverX,
      fixedStepsLastFrame: scene.fixedStepsLastFrame,
      fixedStepsBeforeDefaultGroup: scene.fixedStepsBeforeDefaultGroup,
      fixedDeltaTimeInSeconds: scene.fixedDeltaTimeInSeconds,
      centerX: bounds === null ? null : (bounds.left + bounds.right) / 2,
    };
  }, deltaMilliseconds);

// Spaces frames out in real time so the movement is watchable in the
// recorded video, following keyboard-input.spec.ts's `animateFrames`.
const frameSpacingMilliseconds = 60;

const speedInWorldUnitsPerSecond = 300;

test.describe('fixed update', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the fixed-update scene', async () => {
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=fixed-update');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('runs the fixed-update group once per fixed step a frame paid for, before the default group, with this frame input', async ({
    page,
  }) => {
    const before = await test.step('render a first frame', () =>
      captureFrame(page, 16));

    expect(before.centerX).not.toBeNull();

    await test.step('hold D', () => page.keyboard.down('KeyD'));

    const frames: Awaited<ReturnType<typeof captureFrame>>[] = [];

    await test.step('run frames of 40 ms and 7 ms', async () => {
      for (const delta of [40, 7, 40, 7, 40]) {
        // eslint-disable-next-line no-await-in-loop
        frames.push(await captureFrame(page, delta));
        // eslint-disable-next-line no-await-in-loop, sonarjs/no-fixed-wait-in-tests
        await page.waitForTimeout(frameSpacingMilliseconds);
      }
    });

    await test.step('release D', () => page.keyboard.up('KeyD'));

    await test.step('assert the step counts and the order against the default group', () => {
      const totalSteps = frames.reduce(
        (sum, frame) => sum + frame.fixedStepsLastFrame,
        0,
      );

      // 16 + 40 + 7 + 40 + 7 + 40 ms of frames at 60 steps per second.
      expect(totalSteps).toBeGreaterThanOrEqual(8);
      expect(frames.some((frame) => frame.fixedStepsLastFrame === 0)).toBe(
        true,
      );
      expect(frames.some((frame) => frame.fixedStepsLastFrame >= 2)).toBe(true);

      for (const frame of frames) {
        expect(frame.fixedStepsBeforeDefaultGroup).toBe(
          frame.fixedStepsLastFrame,
        );
      }

      // The first frame after the key-down already moves the square, so the
      // fixed steps read this frame's input.
      const firstSteppingFrame = frames.find(
        (frame) => frame.fixedStepsLastFrame > 0,
      );

      expect(firstSteppingFrame?.moverX).toBeGreaterThan(before.moverX);
    });

    await test.step('assert the square moved by one fixed delta per step, on screen', () => {
      let previous = before;

      for (const frame of frames) {
        const expectedMove =
          frame.fixedStepsLastFrame *
          frame.fixedDeltaTimeInSeconds *
          speedInWorldUnitsPerSecond;

        expect(frame.moverX - previous.moverX).toBeCloseTo(expectedMove, 5);
        expect(frame.centerX).not.toBeNull();

        // 1 world unit is 1 CSS pixel and the test runs at a device pixel
        // ratio of 1; allow a couple of pixels for antialiased edges.
        expect(
          Math.abs(frame.centerX! - previous.centerX! - expectedMove),
        ).toBeLessThan(3);

        previous = frame;
      }
    });
  });
});
