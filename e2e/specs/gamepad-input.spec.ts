import { expect, test } from '@playwright/test';
import { inputSceneColors } from '../fixtures/scenes/input-scene-colors.js';
import type { GamepadInputSceneHandle } from '../fixtures/scenes/gamepad-input.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`. Each `page.evaluate` callback below narrows it to this
// spec's own scene handle type inline - see camera-pan-zoom.spec.ts's `Hooks`
// comment for why.
type Hooks = GamepadInputSceneHandle;
type Page = import('@playwright/test').Page;

// Unlike the keyboard/mouse specs' `captureState`, this one does *not* also
// call `step()` - it only reads. `GamepadInputSource` only re-dispatches an
// action when its *own* polled value changes since the previous poll (see
// its class doc comment), so an extra, unaccounted-for poll (as an
// always-steps `captureState` would add here) changes which frame the
// "stuck at zero" scenario below lands on. Every `step()` in this spec is
// therefore explicit, and `readState` is always called either with no step
// in between (to inspect the result of the last explicit step) or paired
// 1:1 with exactly one `step()`.
const readState = (page: Page) =>
  page.evaluate(
    ({ blue, yellow, cyan }) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      return {
        stickPosition: scene.stickPosition,
        brokenStickPosition: scene.brokenStickPosition,
        menuStickPosition: scene.menuStickPosition,
        stickBounds: scene.measureBounds(blue),
        brokenBounds: scene.measureBounds(yellow),
        menuStickBounds: scene.measureBounds(cyan),
      };
    },
    {
      blue: inputSceneColors.blue,
      yellow: inputSceneColors.yellow,
      cyan: inputSceneColors.cyan,
    },
  );

const step = (page: Page) =>
  page.evaluate(() => (window.__forgeTestHooks as unknown as Hooks).step());

const stepAndReadState = async (page: Page) => {
  await step(page);

  return readState(page);
};

const setStickX = (page: Page, value: number) =>
  page.evaluate(
    (v) => (window.__forgeTestHooks as unknown as Hooks).setStickX(v),
    value,
  );

// Spreads a change over several real-time-spaced frames so it's actually
// watchable in the recorded video (playwright.config.ts's `video: 'on'`),
// following camera-pan-zoom.spec.ts's `animateFrames` pattern.
const frameSpacingMilliseconds = 60;

const animateFrames = async (
  page: Page,
  frameCount: number,
  onFrame?: () => Promise<void>,
): Promise<void> => {
  for (let frame = 0; frame < frameCount; frame++) {
    // eslint-disable-next-line no-await-in-loop
    await onFrame?.();
    // eslint-disable-next-line no-await-in-loop
    await step(page);
    // eslint-disable-next-line no-await-in-loop, sonarjs/no-fixed-wait-in-tests
    await page.waitForTimeout(frameSpacingMilliseconds);
  }
};

test.describe('gamepad input', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the gamepad-input scene', async () => {
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=gamepad-input');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('Axis1dAction with noReset tracks a held stick deflection and ignores deadzone drift', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      stepAndReadState(page));

    await test.step('deflect the stick within the deadzone', () =>
      setStickX(page, 0.05));

    const withinDeadzone =
      await test.step('capture the state with a within-deadzone deflection', () =>
        stepAndReadState(page));

    // Stick values within +-0.15 of 0 are treated as 0.
    expect(withinDeadzone.stickPosition.x).toBe(before.stickPosition.x);

    await test.step('deflect the stick well past the deadzone', () =>
      setStickX(page, 0.8));

    const deflected = await test.step('capture the state while deflected', () =>
      stepAndReadState(page));

    expect(deflected.stickPosition.x).toBeGreaterThan(
      withinDeadzone.stickPosition.x,
    );

    await test.step('assert the stick square visibly moved right on screen', () => {
      expect(before.stickBounds).not.toBeNull();
      expect(deflected.stickBounds).not.toBeNull();

      const centerBefore =
        (before.stickBounds!.left + before.stickBounds!.right) / 2;
      const centerDeflected =
        (deflected.stickBounds!.left + deflected.stickBounds!.right) / 2;

      expect(centerDeflected).toBeGreaterThan(centerBefore);
    });

    await test.step('hold the same deflection over several more frames without it drifting further', () =>
      animateFrames(page, 5));

    const stillDeflected =
      await test.step('capture the state after holding the deflection', () =>
        readState(page));

    // The action's own value should be stable while the stick reading is
    // unchanged - this is about the *action*, not the polling-skip
    // optimization under test elsewhere in this file.
    expect(stillDeflected.stickPosition.x).toBe(deflected.stickPosition.x);

    await test.step('release the stick back to center', () =>
      setStickX(page, 0));

    const released =
      await test.step('capture the state after releasing the stick', () =>
        stepAndReadState(page));

    expect(released.stickPosition.x).toBe(before.stickPosition.x);
  });

  test('Axis1dAction with the default zero reset reads correctly for one frame, then gets stuck at zero', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      stepAndReadState(page));

    await test.step('deflect the stick', () => setStickX(page, 0.8));

    const afterFirstFrame =
      await test.step('capture the state right after the first polled frame with the new deflection', () =>
        stepAndReadState(page));

    expect(afterFirstFrame.brokenStickPosition.x).toBeGreaterThan(
      before.brokenStickPosition.x,
    );

    const stillDeflected =
      await test.step('advance one more frame without changing the stick reading', () =>
        stepAndReadState(page));

    // This is the documented pitfall (gamepad.md's "Gotchas"): the default
    // `actionResetTypes.zero` resets the value to 0 every frame, but the
    // source only re-dispatches when its own reading of the stick changes.
    // Since the stick's raw reading hasn't changed since the previous poll,
    // the source never notices the value was reset out from under it, so
    // the action stays stuck at 0 - snapped back to its base position -
    // even though the stick is still fully deflected.
    expect(stillDeflected.brokenStickPosition.x).toBe(
      before.brokenStickPosition.x,
    );

    await test.step('keep holding the same deflection over several more frames', () =>
      animateFrames(page, 5));

    const remainsStuck =
      await test.step('capture the state after holding the deflection further', () =>
        readState(page));

    await test.step('assert the broken square visibly stayed snapped to its base position', () => {
      expect(before.brokenBounds).not.toBeNull();
      expect(remainsStuck.brokenBounds).not.toBeNull();

      const centerBefore =
        (before.brokenBounds!.left + before.brokenBounds!.right) / 2;
      const centerRemainsStuck =
        (remainsStuck.brokenBounds!.left + remainsStuck.brokenBounds!.right) /
        2;

      expect(centerRemainsStuck).toBeCloseTo(centerBefore, -1);
    });
  });

  test('input groups gate which Axis1dAction a shared stick axis dispatches to', async ({
    page,
  }) => {
    const initial = await test.step('capture the starting state', () =>
      stepAndReadState(page));

    await test.step('deflect the stick right while the "game" group is active', () =>
      setStickX(page, 0.6));

    const afterGameDeflection =
      await test.step('capture the state after the "game"-group deflection', () =>
        stepAndReadState(page));

    expect(afterGameDeflection.stickPosition.x).toBeGreaterThan(
      initial.stickPosition.x,
    );
    // The "menu"-group action must not have received the deflection at all.
    expect(afterGameDeflection.menuStickPosition.x).toBe(
      initial.menuStickPosition.x,
    );

    await test.step('switch the active group to "menu"', () =>
      page.evaluate(() =>
        (window.__forgeTestHooks as unknown as Hooks).setActiveGroup('menu'),
      ));

    await test.step('deflect the stick to a new value while the "menu" group is active', () =>
      setStickX(page, -0.6));

    const afterMenuDeflection =
      await test.step('capture the state after the "menu"-group deflection', () =>
        stepAndReadState(page));

    // The "game" action must not have picked up the new deflection - it's
    // gated, not just quiet because nothing changed.
    expect(afterMenuDeflection.stickPosition.x).toBe(
      afterGameDeflection.stickPosition.x,
    );
    expect(afterMenuDeflection.menuStickPosition.x).toBeLessThan(
      afterGameDeflection.menuStickPosition.x,
    );

    await test.step('assert the "menu" square visibly moved left on screen', () => {
      expect(afterGameDeflection.menuStickBounds).not.toBeNull();
      expect(afterMenuDeflection.menuStickBounds).not.toBeNull();

      const centerAfterGame =
        (afterGameDeflection.menuStickBounds!.left +
          afterGameDeflection.menuStickBounds!.right) /
        2;
      const centerAfterMenu =
        (afterMenuDeflection.menuStickBounds!.left +
          afterMenuDeflection.menuStickBounds!.right) /
        2;

      expect(centerAfterMenu).toBeLessThan(centerAfterGame);
    });

    await test.step('switch back to "game" and deflect to a third value', () =>
      page.evaluate(() =>
        (window.__forgeTestHooks as unknown as Hooks).setActiveGroup('game'),
      ));
    await test.step('deflect the stick to a third value', () =>
      setStickX(page, 0.9));

    const afterSwitchingBack =
      await test.step('capture the state after switching back to "game"', () =>
        stepAndReadState(page));

    expect(afterSwitchingBack.stickPosition.x).toBeGreaterThan(
      afterGameDeflection.stickPosition.x,
    );
    expect(afterSwitchingBack.menuStickPosition.x).toBe(
      afterMenuDeflection.menuStickPosition.x,
    );
  });
});
