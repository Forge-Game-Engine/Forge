import { expect, test } from '@playwright/test';
import type {
  BallState,
  FixedTimestepPhysicsSceneHandle,
} from '../fixtures/scenes/fixed-timestep-physics.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`. Each `page.evaluate` callback below narrows it to this
// spec's own scene handle type inline - see camera-pan-zoom.spec.ts's `Hooks`
// comment for why.
type Hooks = FixedTimestepPhysicsSceneHandle;
type Page = import('@playwright/test').Page;

// Every frame length is a multiple of 1/128 ms, as the scene's 1000 / 64 ms
// fixed delta is, so the clock and the fixed-step accumulator add up exactly
// and each run takes exactly one fixed step per 15.625 ms. Frame lengths
// like 1000 / 30 and 1000 / 120 ms round differently when summed, which
// could leave one run a step ahead of another.
const thirtyTwoHertzFrames = Array<number>(32).fill(31.25);
const oneHundredTwentyEightHertzFrames = Array<number>(128).fill(7.8125);
// A hitch-like mix: frames that run zero, one, two and three fixed steps.
// Every repeat is 125 ms, so a frame boundary falls on 500 ms.
const mixedFrames = Array.from({ length: 8 }, () => [
  7.8125, 46.875, 15.625, 31.25, 23.4375,
]).flat();

const halfwayMilliseconds = 500;

const loadScene = async (page: Page): Promise<void> => {
  let pageError: Error | undefined;

  page.once('pageerror', (error) => {
    pageError = error;
  });

  await page.goto('/?scene=fixed-timestep-physics');

  try {
    await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
  } catch (timeoutError) {
    throw pageError ?? timeoutError;
  }
};

interface Snapshot {
  fixedSteps: number;
  ball: BallState;
}

interface RunResult {
  halfway: Snapshot;
  end: Snapshot;
}

/**
 * Runs `frames` (frame lengths in milliseconds) through a freshly loaded
 * scene, and snapshots it at the frame boundary at `halfwayMilliseconds`
 * and at the end.
 */
const runFrames = async (page: Page, frames: number[]): Promise<RunResult> => {
  await loadScene(page);

  return page.evaluate(
    ({ frameLengths, halfway }) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;
      const snapshot = (): Snapshot => ({
        fixedSteps: scene.fixedSteps,
        ball: scene.ball,
      });

      let elapsed = 0;
      let halfwaySnapshot: Snapshot | null = null;

      for (const frameLength of frameLengths) {
        scene.step(frameLength);
        elapsed += frameLength;

        if (elapsed === halfway) {
          halfwaySnapshot = snapshot();
        }
      }

      if (halfwaySnapshot === null) {
        throw new Error(`No frame boundary fell on ${halfway} ms.`);
      }

      return { halfway: halfwaySnapshot, end: snapshot() };
    },
    { frameLengths: frames, halfway: halfwayMilliseconds },
  );
};

const captureFrame = (page: Page, deltaMilliseconds: number) =>
  page.evaluate((delta) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step(delta);

    const bounds = scene.measureBallBounds();

    return {
      ball: scene.ball,
      centerY: bounds === null ? null : (bounds.top + bounds.bottom) / 2,
    };
  }, deltaMilliseconds);

// Spaces frames out in real time so the fall is watchable in the recorded
// video, following keyboard-input.spec.ts's `animateFrames`.
const frameSpacingMilliseconds = 60;

test.describe('fixed-timestep physics', () => {
  test('simulates the same fall at any frame rate', async ({ page }) => {
    const thirtyTwoHertz = await test.step('run 32 frames of 31.25 ms', () =>
      runFrames(page, thirtyTwoHertzFrames));
    const oneHundredTwentyEightHertz =
      await test.step('run 128 frames of 7.8125 ms', () =>
        runFrames(page, oneHundredTwentyEightHertzFrames));
    const mixed = await test.step('run 40 frames of mixed lengths', () =>
      runFrames(page, mixedFrames));

    await test.step('assert every run took the same fixed steps', () => {
      for (const run of [thirtyTwoHertz, oneHundredTwentyEightHertz, mixed]) {
        expect(run.halfway.fixedSteps).toBe(32);
        expect(run.end.fixedSteps).toBe(64);
      }
    });

    await test.step('assert the ball landed and bounced', () => {
      // Still falling halfway through the first fall would mean the floor
      // was never hit, and the runs would agree for the wrong reason: free
      // fall reads only velocity and `local`, so a missing fixed transform
      // pass only shows once the ball collides.
      expect(thirtyTwoHertz.halfway.ball.velocityY).toBeLessThan(0);
    });

    await test.step('assert every run ended in the same pose', () => {
      // `toEqual` compares each number exactly: the same steps run the same
      // arithmetic, whatever the frames' lengths.
      expect(oneHundredTwentyEightHertz.halfway.ball).toEqual(
        thirtyTwoHertz.halfway.ball,
      );
      expect(mixed.halfway.ball).toEqual(thirtyTwoHertz.halfway.ball);
      expect(oneHundredTwentyEightHertz.end.ball).toEqual(
        thirtyTwoHertz.end.ball,
      );
      expect(mixed.end.ball).toEqual(thirtyTwoHertz.end.ball);
    });
  });

  test("draws the ball where the frame's transform system put it", async ({
    page,
  }) => {
    await test.step('load the fixed-timestep-physics scene', () =>
      loadScene(page));

    const before = await test.step('render a first frame with no step', () =>
      captureFrame(page, 0));

    expect(before.centerY).not.toBeNull();

    let after = before;

    await test.step('run 8 frames of 31.25 ms', async () => {
      for (let frame = 0; frame < 8; frame++) {
        // eslint-disable-next-line no-await-in-loop
        after = await captureFrame(page, 31.25);
        // eslint-disable-next-line no-await-in-loop, sonarjs/no-fixed-wait-in-tests
        await page.waitForTimeout(frameSpacingMilliseconds);
      }
    });

    await test.step('assert the on-screen drop matches the drawn drop', () => {
      expect(after.centerY).not.toBeNull();

      const drawnDrop = after.ball.worldY - before.ball.worldY;
      const onScreenDrop = after.centerY! - before.centerY!;

      // Each 31.25 ms frame runs two whole steps, so the frame's transform
      // system draws the ball at the start of its last step: mid-fall about
      // 8 px above where the simulation has it. 1 world unit is 1 CSS pixel
      // and the test runs at a device pixel ratio of 1; allow a couple of
      // pixels for antialiased edges.
      expect(drawnDrop).toBeGreaterThan(50);
      expect(Math.abs(onScreenDrop - drawnDrop)).toBeLessThan(2);
      expect(after.ball.localY - after.ball.worldY).toBeGreaterThan(2);
    });
  });
});
