import { expect, test } from '@playwright/test';
import type { CharacterAnimationSceneHandle } from '../fixtures/scenes/character-animation.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`. Each `page.evaluate` callback below narrows it to this
// spec's own scene handle type inline - see camera-pan-zoom.spec.ts's `Hooks`
// comment for why.
type Hooks = CharacterAnimationSceneHandle;
type Page = import('@playwright/test').Page;

const captureState = (page: Page) =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    return {
      playerLocalX: scene.playerLocalX,
      isFlippedX: scene.isFlippedX,
      isRunClipActive: scene.isRunClipActive,
      animationFrameIndex: scene.animationFrameIndex,
      centroidX: scene.measureCharacterCentroidX(),
    };
  });

const step = (page: Page) =>
  page.evaluate(() => (window.__forgeTestHooks as unknown as Hooks).step());

// Spreads a change over several real-time-spaced frames so it's actually
// watchable in the recorded video (playwright.config.ts's `video: 'on'`),
// following camera-pan-zoom.spec.ts's `animateFrames` pattern.
const frameSpacingMilliseconds = 60;

const animateFrames = async (page: Page, frameCount: number): Promise<void> => {
  for (let frame = 0; frame < frameCount; frame++) {
    // eslint-disable-next-line no-await-in-loop
    await step(page);
    // eslint-disable-next-line no-await-in-loop, sonarjs/no-fixed-wait-in-tests
    await page.waitForTimeout(frameSpacingMilliseconds);
  }
};

// Long enough for several `frameDurationMilliseconds` (90ms, scene-side) to
// elapse given the scene's fixed ~16.67ms-per-step virtual clock, so the
// active clip's `animationFrameIndex` has a chance to actually advance.
const framesPerHold = 12;

test.describe('character animation', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the character-animation scene', async () => {
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=character-animation');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('idles in place, with no run clip active, until a movement key is pressed', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      captureState(page));

    expect(before.isRunClipActive).toBe(false);
    expect(before.centroidX).not.toBeNull();

    await test.step('advance several frames with no key held', () =>
      animateFrames(page, framesPerHold));

    const after = await test.step('capture the state after idling', () =>
      captureState(page));

    expect(after.playerLocalX).toBe(before.playerLocalX);
    expect(after.isRunClipActive).toBe(false);
  });

  test('holding ArrowRight moves the character right, activates the run clip, and does not flip it', async ({
    page,
  }) => {
    const earlyHeld =
      await test.step('press ArrowRight and let the run pose settle', async () => {
        await page.keyboard.down('ArrowRight');

        // One frame is enough for `movementSystem` to switch to the run clip
        // and flip state; the comparison below only cares about movement
        // *within* that settled run pose, not the one-time idle-to-run switch
        // itself (which - since idle and run are visually distinct poses -
        // would otherwise swamp a naive before/after pixel comparison with
        // pose-change noise unrelated to translation).
        await animateFrames(page, 1);

        return captureState(page);
      });

    expect(earlyHeld.isRunClipActive).toBe(true);
    expect(earlyHeld.isFlippedX).toBe(false);

    await test.step('keep holding ArrowRight over several more frames', () =>
      animateFrames(page, framesPerHold));

    const lateHeld =
      await test.step('capture the state after holding longer', () =>
        captureState(page));

    await test.step('release ArrowRight', () => page.keyboard.up('ArrowRight'));

    expect(lateHeld.playerLocalX).toBeGreaterThan(earlyHeld.playerLocalX);
    expect(lateHeld.isRunClipActive).toBe(true);
    expect(lateHeld.isFlippedX).toBe(false);

    // The rendered proof: the character's on-screen center of mass actually
    // moved right, not just its ECS position.
    expect(earlyHeld.centroidX).not.toBeNull();
    expect(lateHeld.centroidX).not.toBeNull();
    expect(lateHeld.centroidX!).toBeGreaterThan(earlyHeld.centroidX!);
  });

  test('holding ArrowLeft moves the character left, activates the run clip, and flips it', async ({
    page,
  }) => {
    const earlyHeld =
      await test.step('press ArrowLeft and let the run pose settle', async () => {
        await page.keyboard.down('ArrowLeft');
        await animateFrames(page, 1);

        return captureState(page);
      });

    expect(earlyHeld.isRunClipActive).toBe(true);
    expect(earlyHeld.isFlippedX).toBe(true);

    await test.step('keep holding ArrowLeft over several more frames', () =>
      animateFrames(page, framesPerHold));

    const lateHeld =
      await test.step('capture the state after holding longer', () =>
        captureState(page));

    await test.step('release ArrowLeft', () => page.keyboard.up('ArrowLeft'));

    expect(lateHeld.playerLocalX).toBeLessThan(earlyHeld.playerLocalX);
    expect(lateHeld.isRunClipActive).toBe(true);
    expect(lateHeld.isFlippedX).toBe(true);

    // The rendered proof: the character's on-screen center of mass actually
    // moved left, not just its ECS position.
    expect(earlyHeld.centroidX).not.toBeNull();
    expect(lateHeld.centroidX).not.toBeNull();
    expect(lateHeld.centroidX!).toBeLessThan(earlyHeld.centroidX!);
  });

  test('releasing every movement key returns the character to the idle clip and it stops moving', async ({
    page,
  }) => {
    await test.step('hold ArrowRight, then release it', async () => {
      await page.keyboard.down('ArrowRight');
      await animateFrames(page, framesPerHold);
      await page.keyboard.up('ArrowRight');
      // One frame for `movementSystem` to observe the axis back at 0 and
      // switch the clip back to idle.
      await animateFrames(page, 1);
    });

    const afterRelease =
      await test.step('capture the state right after release', () =>
        captureState(page));

    expect(afterRelease.isRunClipActive).toBe(false);

    await test.step('advance several more frames', () =>
      animateFrames(page, framesPerHold));

    const later =
      await test.step('capture the state several frames later', () =>
        captureState(page));

    expect(later.playerLocalX).toBe(afterRelease.playerLocalX);
    expect(later.isRunClipActive).toBe(false);
  });

  test('the run clip visibly changes the rendered character at each animation frame advance', async ({
    page,
  }) => {
    await test.step('hold ArrowRight and let the run clip take over', async () => {
      await page.keyboard.down('ArrowRight');
      await animateFrames(page, framesPerHold);
    });

    // Everything from here runs inside one `page.evaluate` call: each
    // `step()` is immediately followed by a canvas readback (see
    // `SceneHandle.step`'s and `captureCanvasSnapshot`'s docs for why a
    // canvas readback must share a task with the step that produced the
    // frame it's reading), and comparing readbacks across separate
    // `page.evaluate` round-trips would add unrelated timing variance to a
    // measurement that's already comparing single-digit-millisecond frames
    // against each other.
    const samples =
      await test.step('sample per-step pixel change around a frame-index advance', () =>
        page.evaluate(() => {
          const scene = window.__forgeTestHooks as unknown as Hooks;

          scene.step();
          scene.captureCanvasSnapshot();

          let previousFrameIndex = scene.animationFrameIndex;
          const results: { frameChanged: boolean; changedPixels: number }[] =
            [];

          // `frameDurationMilliseconds` (90ms, scene-side) against the
          // scene's fixed ~16.67ms-per-step virtual clock means the clip
          // advances roughly every 5-6 steps; 8 is comfortably enough to
          // observe one advance.
          const maxSamples = 8;

          for (let i = 0; i < maxSamples; i++) {
            scene.step();

            const changedPixels = scene.countChangedPixelsSinceSnapshot();
            const frameChanged =
              scene.animationFrameIndex !== previousFrameIndex;

            results.push({ frameChanged, changedPixels });
            previousFrameIndex = scene.animationFrameIndex;

            if (frameChanged) {
              break;
            }
          }

          return results;
        }));

    await page.keyboard.up('ArrowRight');

    const changedSamples = samples.filter((sample) => sample.frameChanged);
    const unchangedSamples = samples.filter((sample) => !sample.frameChanged);

    // The clip must have actually advanced within the sampling window,
    // and there must be at least one steady-state (pose-unchanged) sample
    // to compare it against.
    expect(changedSamples.length).toBeGreaterThan(0);
    expect(unchangedSamples.length).toBeGreaterThan(0);

    const maxSteadyStateDiff = Math.max(
      ...unchangedSamples.map((sample) => sample.changedPixels),
    );
    const transitionDiff = changedSamples[0].changedPixels;

    // A generous multiple, not a tight bound: `countChangedPixelsSinceSnapshot`
    // re-centers on the character every read (see `readCenteredPatch`), so
    // steady-state samples already have translation mostly factored out and
    // only show a small residual (recentering/antialiasing) delta. The step
    // where `animationFrameIndex` actually advances swaps in a
    // pose-different frame (limbs in a different position), which should
    // dwarf that residual - this is what ties the rendered pixels directly
    // to the animation system's own frame-advance logic, rather than to
    // translation alone.
    expect(transitionDiff).toBeGreaterThan(maxSteadyStateDiff * 1.5);
  });
});
