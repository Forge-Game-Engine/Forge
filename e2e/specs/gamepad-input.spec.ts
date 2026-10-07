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
// call `step()` - it only reads. `GamepadInputSource` polls the gamepad in
// `step()`, so keeping every poll explicit makes it obvious which frame
// first sees a change to the fake gamepad: `readState` is always called
// either with no step in between (to inspect the result of the last
// explicit step) or paired 1:1 with exactly one `step()`.
const readState = (page: Page) =>
  page.evaluate(
    ({ blue, cyan, green, orange, magenta }) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      return {
        stickPosition: scene.stickPosition,
        menuStickPosition: scene.menuStickPosition,
        verticalPosition: scene.verticalPosition,
        isShooting: scene.isShooting,
        restartCount: scene.restartCount,
        stickBounds: scene.measureBounds(blue),
        menuStickBounds: scene.measureBounds(cyan),
        verticalBounds: scene.measureBounds(green),
        holdBounds: scene.measureBounds(orange),
        triggerBounds: scene.measureBounds(magenta),
      };
    },
    {
      blue: inputSceneColors.blue,
      cyan: inputSceneColors.cyan,
      green: inputSceneColors.green,
      orange: inputSceneColors.orange,
      magenta: inputSceneColors.magenta,
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

const setStickY = (page: Page, value: number) =>
  page.evaluate(
    (v) => (window.__forgeTestHooks as unknown as Hooks).setStickY(v),
    value,
  );

const setButton = (
  page: Page,
  button: Parameters<Hooks['setButton']>[0],
  pressed: boolean,
) =>
  page.evaluate(
    ({ b, p }) => (window.__forgeTestHooks as unknown as Hooks).setButton(b, p),
    { b: button, p: pressed },
  );

const disconnect = (page: Page) =>
  page.evaluate(() =>
    (window.__forgeTestHooks as unknown as Hooks).disconnect(),
  );

type Bounds = { left: number; right: number; top: number; bottom: number };

const centerX = (bounds: Bounds): number => (bounds.left + bounds.right) / 2;
const centerY = (bounds: Bounds): number => (bounds.top + bounds.bottom) / 2;
const width = (bounds: Bounds): number => bounds.right - bounds.left;

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

  test('Axis1dAction tracks a held stick deflection and ignores deadzone drift', async ({
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

    // The gamepad reports the same deflection every poll, so the action
    // keeps reading it for as long as the stick is held.
    expect(stillDeflected.stickPosition.x).toBe(deflected.stickPosition.x);

    await test.step('release the stick back to center', () =>
      setStickX(page, 0));

    const released =
      await test.step('capture the state after releasing the stick', () =>
        stepAndReadState(page));

    expect(released.stickPosition.x).toBe(before.stickPosition.x);
  });

  test('input groups gate which Axis1dAction a shared stick axis drives', async ({
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

    // The "game" action is released as soon as its group is deactivated,
    // and must not have picked up the new deflection either, even though
    // the gamepad reports it for both actions every poll.
    expect(afterMenuDeflection.stickPosition.x).toBe(initial.stickPosition.x);
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
    // Likewise, the "menu" action is released once "menu" is deactivated.
    expect(afterSwitchingBack.menuStickPosition.x).toBe(
      initial.menuStickPosition.x,
    );
  });

  test('a GamepadHoldBinding holds its HoldAction for exactly as long as the button is pressed', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      stepAndReadState(page));

    expect(before.isShooting).toBe(false);

    await test.step('press the bottom face button', () =>
      setButton(page, 'faceButtonBottom', true));

    const pressed = await test.step('capture the state while pressed', () =>
      stepAndReadState(page));

    expect(pressed.isShooting).toBe(true);

    await test.step('keep holding the button over several frames', () =>
      animateFrames(page, 5));

    const stillPressed =
      await test.step('capture the state after holding the button', () =>
        readState(page));

    expect(stillPressed.isShooting).toBe(true);

    await test.step('assert the hold square visibly grew while held', () => {
      expect(before.holdBounds).not.toBeNull();
      expect(stillPressed.holdBounds).not.toBeNull();
      expect(width(stillPressed.holdBounds!)).toBeGreaterThan(
        width(before.holdBounds!) * 2,
      );
    });

    await test.step('release the button', () =>
      setButton(page, 'faceButtonBottom', false));

    const released =
      await test.step('capture the state after releasing the button', () =>
        stepAndReadState(page));

    expect(released.isShooting).toBe(false);
    expect(width(released.holdBounds!)).toBeCloseTo(
      width(before.holdBounds!),
      -1,
    );
  });

  test('a GamepadTriggerBinding triggers its TriggerAction once per press, not once per frame held', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      stepAndReadState(page));

    expect(before.restartCount).toBe(0);

    await test.step('press and keep holding start over several frames', async () => {
      await setButton(page, 'start', true);
      await animateFrames(page, 5);
    });

    const afterFirstPress =
      await test.step('capture the state after the first press', () =>
        readState(page));

    expect(afterFirstPress.restartCount).toBe(1);

    await test.step('release start, then press it a second time', async () => {
      await setButton(page, 'start', false);
      await animateFrames(page, 2);
      await setButton(page, 'start', true);
      await animateFrames(page, 3);
    });

    const afterSecondPress =
      await test.step('capture the state after the second press', () =>
        readState(page));

    expect(afterSecondPress.restartCount).toBe(2);

    await test.step('assert the trigger square visibly stepped right exactly twice', () => {
      expect(before.triggerBounds).not.toBeNull();
      expect(afterFirstPress.triggerBounds).not.toBeNull();
      expect(afterSecondPress.triggerBounds).not.toBeNull();

      const firstStep =
        centerX(afterFirstPress.triggerBounds!) -
        centerX(before.triggerBounds!);
      const secondStep =
        centerX(afterSecondPress.triggerBounds!) -
        centerX(afterFirstPress.triggerBounds!);

      // Both steps are the same size, so the action fired once per press.
      expect(firstStep).toBeGreaterThan(0);
      expect(secondStep).toBeCloseTo(firstStep, -1);
    });
  });

  test('a stick pushed up and D-pad up drive an up-is-positive action the same way', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      stepAndReadState(page));

    await test.step('press D-pad up', () => setButton(page, 'dpadUp', true));

    const dpadUp = await test.step('capture the state with D-pad up', () =>
      stepAndReadState(page));

    expect(dpadUp.verticalPosition.y).toBeGreaterThan(
      before.verticalPosition.y,
    );

    await test.step('release D-pad up', async () => {
      await setButton(page, 'dpadUp', false);
      await step(page);
    });

    // The W3C Standard Gamepad reports a stick pushed up as -1; the engine
    // reads it as up-positive.
    await test.step('push the stick up', () => setStickY(page, -0.8));

    const stickUp = await test.step('capture the state with the stick up', () =>
      stepAndReadState(page));

    expect(stickUp.verticalPosition.y).toBeGreaterThan(
      before.verticalPosition.y,
    );

    await test.step('assert the stick and D-pad moved the square the same way on screen', () => {
      expect(before.verticalBounds).not.toBeNull();
      expect(dpadUp.verticalBounds).not.toBeNull();
      expect(stickUp.verticalBounds).not.toBeNull();

      const baseCenter = centerY(before.verticalBounds!);
      const dpadOffset = centerY(dpadUp.verticalBounds!) - baseCenter;
      const stickOffset = centerY(stickUp.verticalBounds!) - baseCenter;

      expect(Math.abs(dpadOffset)).toBeGreaterThan(0);
      expect(Math.sign(stickOffset)).toBe(Math.sign(dpadOffset));
      // A 0.8 deflection travels 80% as far as the D-pad's full 1.
      expect(stickOffset / dpadOffset).toBeGreaterThan(0.7);
      expect(stickOffset / dpadOffset).toBeLessThan(0.9);
    });
  });

  test('unplugging the gamepad releases the axes and holds it was driving', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      stepAndReadState(page));

    await test.step('deflect the stick and hold the bottom face button', async () => {
      await setStickX(page, 0.8);
      await setButton(page, 'faceButtonBottom', true);
    });

    const engaged = await test.step('capture the state while engaged', () =>
      stepAndReadState(page));

    expect(engaged.stickPosition.x).toBeGreaterThan(before.stickPosition.x);
    expect(engaged.isShooting).toBe(true);

    await test.step('unplug the gamepad', () => disconnect(page));

    const unplugged =
      await test.step('capture the state after unplugging', () =>
        stepAndReadState(page));

    // Axes hold their sources' last report, so without the release the
    // stick's action would stay deflected forever.
    expect(unplugged.stickPosition.x).toBe(before.stickPosition.x);
    expect(unplugged.isShooting).toBe(false);

    await test.step('assert the stick square visibly snapped back and the hold square shrank', () => {
      expect(before.stickBounds).not.toBeNull();
      expect(engaged.stickBounds).not.toBeNull();
      expect(unplugged.stickBounds).not.toBeNull();

      expect(centerX(engaged.stickBounds!)).toBeGreaterThan(
        centerX(before.stickBounds!),
      );
      expect(centerX(unplugged.stickBounds!)).toBeCloseTo(
        centerX(before.stickBounds!),
        -1,
      );
      expect(width(unplugged.holdBounds!)).toBeLessThan(
        width(engaged.holdBounds!),
      );
    });
  });
});
