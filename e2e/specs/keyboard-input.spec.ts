import { expect, test } from '@playwright/test';
import { inputSceneColors } from '../fixtures/scenes/input-scene-colors.js';
import type { KeyboardInputSceneHandle } from '../fixtures/scenes/keyboard-input.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`. Each `page.evaluate` callback below narrows it to this
// spec's own scene handle type inline - see camera-pan-zoom.spec.ts's `Hooks`
// comment for why.
type Hooks = KeyboardInputSceneHandle;
type Page = import('@playwright/test').Page;

const captureState = (page: Page) =>
  page.evaluate(
    ({ blue, red, green, magenta, orange }) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.step();

      return {
        moverPosition: scene.moverPosition,
        gameTriggerCount: scene.gameTriggerCount,
        menuTriggerCount: scene.menuTriggerCount,
        isCrouching: scene.isCrouching,
        moverBounds: scene.measureBounds(blue),
        redMarkerBounds: scene.measureBounds(red),
        greenMarkerBounds: scene.measureBounds(green),
        magentaMarkerBounds: scene.measureBounds(magenta),
        holdBounds: scene.measureBounds(orange),
      };
    },
    {
      blue: inputSceneColors.blue,
      red: inputSceneColors.red,
      green: inputSceneColors.green,
      magenta: inputSceneColors.magenta,
      orange: inputSceneColors.orange,
    },
  );

const step = (page: Page) =>
  page.evaluate(() => (window.__forgeTestHooks as unknown as Hooks).step());

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

test.describe('keyboard input', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the keyboard-input scene', async () => {
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=keyboard-input');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('Axis2dAction moves continuously while WASD is held, and stops on release', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      captureState(page));

    await test.step('hold D over several frames', async () => {
      await page.keyboard.down('KeyD');
      await animateFrames(page, 10);
    });

    const whileHeld = await test.step('capture the state while held', () =>
      captureState(page));

    expect(whileHeld.moverPosition.x).toBeGreaterThan(before.moverPosition.x);

    await test.step('assert the mover square visibly moved right on screen', () => {
      expect(before.moverBounds).not.toBeNull();
      expect(whileHeld.moverBounds).not.toBeNull();

      const centerBefore =
        (before.moverBounds!.left + before.moverBounds!.right) / 2;
      const centerWhileHeld =
        (whileHeld.moverBounds!.left + whileHeld.moverBounds!.right) / 2;

      expect(centerWhileHeld).toBeGreaterThan(centerBefore);
    });

    await test.step('release D and advance one more frame', async () => {
      await page.keyboard.up('KeyD');
      await animateFrames(page, 1);
    });

    const afterRelease =
      await test.step('capture the state after release', () =>
        captureState(page));

    const oneMoreStepLater =
      await test.step('capture the state one more frame later', () =>
        captureState(page));

    // The axis holds whatever the keyboard last reported, and the key-up
    // reported 0 (no keys held), so movement should have fully stopped
    // instead of continuing or reverting.
    expect(oneMoreStepLater.moverPosition.x).toBe(afterRelease.moverPosition.x);
  });

  test('TriggerAction fires once per key press, not per frame held', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      captureState(page));

    expect(before.gameTriggerCount).toBe(0);

    await test.step('press and hold Space over several frames', async () => {
      await page.keyboard.down('Space');
      await animateFrames(page, 6);
    });

    const whileHeld = await test.step('capture the state while held', () =>
      captureState(page));

    // KeyboardInputSource filters out the browser's auto-repeat keydown
    // events, so holding the key must not re-trigger every frame.
    expect(whileHeld.gameTriggerCount).toBe(1);

    await test.step('assert the marker square turned green on screen', () => {
      expect(whileHeld.greenMarkerBounds).not.toBeNull();
      expect(whileHeld.redMarkerBounds).toBeNull();
    });

    await test.step('release and press Space again', async () => {
      await page.keyboard.up('Space');
      await animateFrames(page, 2);
      await page.keyboard.down('Space');
      await animateFrames(page, 2);
      await page.keyboard.up('Space');
      await animateFrames(page, 1);
    });

    const afterSecondPress =
      await test.step('capture the state after the second press', () =>
        captureState(page));

    expect(afterSecondPress.gameTriggerCount).toBe(2);

    await test.step('assert the marker square toggled back to red on screen', () => {
      expect(afterSecondPress.redMarkerBounds).not.toBeNull();
      expect(afterSecondPress.greenMarkerBounds).toBeNull();
    });
  });

  test('HoldAction grows the square while held, and shrinks it back on release', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      captureState(page));

    expect(before.isCrouching).toBe(false);
    expect(before.holdBounds).not.toBeNull();

    const widthBefore = before.holdBounds!.right - before.holdBounds!.left;

    await test.step('press and hold KeyC', async () => {
      await page.keyboard.down('KeyC');
      await animateFrames(page, 4);
    });

    const whileHeld = await test.step('capture the state while held', () =>
      captureState(page));

    expect(whileHeld.isCrouching).toBe(true);

    const widthWhileHeld =
      whileHeld.holdBounds!.right - whileHeld.holdBounds!.left;

    expect(widthWhileHeld).toBeGreaterThan(widthBefore);

    await test.step('release KeyC', async () => {
      await page.keyboard.up('KeyC');
      await animateFrames(page, 1);
    });

    const afterRelease =
      await test.step('capture the state after release', () =>
        captureState(page));

    expect(afterRelease.isCrouching).toBe(false);

    const widthAfterRelease =
      afterRelease.holdBounds!.right - afterRelease.holdBounds!.left;

    // Generous tolerance for antialiased edge pixels, not an exact byte
    // match - see input-scene-helpers.ts's `colorMatchTolerance`.
    expect(Math.abs(widthAfterRelease - widthBefore)).toBeLessThan(4);
  });

  test('a HoldAction needs a fresh press after its group is reactivated', async ({
    page,
  }) => {
    const holdWidth = (state: Awaited<ReturnType<typeof captureState>>) => {
      expect(state.holdBounds).not.toBeNull();

      return state.holdBounds!.right - state.holdBounds!.left;
    };

    const before = await test.step('capture the starting state', () =>
      captureState(page));

    expect(before.isCrouching).toBe(false);

    await test.step('press and hold KeyC while "game" is active', async () => {
      await page.keyboard.down('KeyC');
      await animateFrames(page, 3);
    });

    const whileHeld = await test.step('capture the state while held', () =>
      captureState(page));

    expect(whileHeld.isCrouching).toBe(true);
    expect(holdWidth(whileHeld)).toBeGreaterThan(holdWidth(before));

    await test.step('switch to "menu" and back to "game" with KeyC still held', async () => {
      await page.evaluate(() =>
        (window.__forgeTestHooks as unknown as Hooks).setActiveGroup('menu'),
      );
      await animateFrames(page, 2);
      await page.evaluate(() =>
        (window.__forgeTestHooks as unknown as Hooks).setActiveGroup('game'),
      );
      await animateFrames(page, 3);
    });

    const afterSwitchingBack =
      await test.step('capture the state after switching back to "game"', () =>
        captureState(page));

    // Deactivating "game" ended the hold, and a key that's already down when
    // its group becomes active doesn't start a new one - only a press made
    // while the group is active does.
    expect(afterSwitchingBack.isCrouching).toBe(false);

    await test.step('assert the hold square shrank back on screen', () => {
      expect(holdWidth(afterSwitchingBack)).toBeLessThan(holdWidth(whileHeld));
      // Generous tolerance for antialiased edge pixels, not an exact byte
      // match - see input-scene-helpers.ts's `colorMatchTolerance`.
      expect(
        Math.abs(holdWidth(afterSwitchingBack) - holdWidth(before)),
      ).toBeLessThan(4);
    });

    await test.step('release KeyC and press it again', async () => {
      await page.keyboard.up('KeyC');
      await animateFrames(page, 1);
      await page.keyboard.down('KeyC');
      await animateFrames(page, 3);
    });

    const afterFreshPress =
      await test.step('capture the state after the fresh press', () =>
        captureState(page));

    expect(afterFreshPress.isCrouching).toBe(true);

    await test.step('assert the hold square grew again on screen', () => {
      expect(holdWidth(afterFreshPress)).toBeGreaterThan(
        holdWidth(afterSwitchingBack),
      );
      expect(
        Math.abs(holdWidth(afterFreshPress) - holdWidth(whileHeld)),
      ).toBeLessThan(4);
    });

    await test.step('release KeyC', async () => {
      await page.keyboard.up('KeyC');
      await animateFrames(page, 1);
    });
  });

  test('input groups gate which TriggerAction the same key fires', async ({
    page,
  }) => {
    const initial = await test.step('capture the starting state', () =>
      captureState(page));

    expect(initial.gameTriggerCount).toBe(0);
    expect(initial.menuTriggerCount).toBe(0);

    await test.step('press Space while the "game" group is active', async () => {
      await page.keyboard.down('Space');
      await animateFrames(page, 2);
      await page.keyboard.up('Space');
      await animateFrames(page, 1);
    });

    const afterGamePress =
      await test.step('capture the state after the "game"-group press', () =>
        captureState(page));

    expect(afterGamePress.gameTriggerCount).toBe(1);
    expect(afterGamePress.menuTriggerCount).toBe(0);
    expect(afterGamePress.magentaMarkerBounds).toBeNull();

    await test.step('switch the active group to "menu"', () =>
      page.evaluate(() =>
        (window.__forgeTestHooks as unknown as Hooks).setActiveGroup('menu'),
      ));

    await test.step('press Space while the "menu" group is active', async () => {
      await page.keyboard.down('Space');
      await animateFrames(page, 2);
      await page.keyboard.up('Space');
      await animateFrames(page, 1);
    });

    const afterMenuPress =
      await test.step('capture the state after the "menu"-group press', () =>
        captureState(page));

    // The "game" trigger must not have fired again - only its group's
    // dispatch was gated, proving the gate is per-binding, not global.
    expect(afterMenuPress.gameTriggerCount).toBe(1);
    expect(afterMenuPress.menuTriggerCount).toBe(1);

    await test.step('assert the marker square turned magenta on screen', () => {
      expect(afterMenuPress.magentaMarkerBounds).not.toBeNull();
    });

    await test.step('switch back to "game" and press Space once more', async () => {
      await page.evaluate(() =>
        (window.__forgeTestHooks as unknown as Hooks).setActiveGroup('game'),
      );
      await page.keyboard.down('Space');
      await animateFrames(page, 2);
      await page.keyboard.up('Space');
      await animateFrames(page, 1);
    });

    const afterSwitchingBack =
      await test.step('capture the state after switching back to "game"', () =>
        captureState(page));

    expect(afterSwitchingBack.gameTriggerCount).toBe(2);
    expect(afterSwitchingBack.menuTriggerCount).toBe(1);
  });

  test('switching input groups mid-input leaves an Axis2dAction neither stuck nor reversed', async ({
    page,
  }) => {
    const moverCenterX = (state: Awaited<ReturnType<typeof captureState>>) => {
      expect(state.moverBounds).not.toBeNull();

      return (state.moverBounds!.left + state.moverBounds!.right) / 2;
    };

    await test.step('hold D while the "game" group is active', async () => {
      await page.keyboard.down('KeyD');
      await animateFrames(page, 3);
    });

    const switchedAway =
      await test.step('switch to "menu" while D is still held', async () => {
        await page.evaluate(() =>
          (window.__forgeTestHooks as unknown as Hooks).setActiveGroup('menu'),
        );

        return captureState(page);
      });

    await test.step('advance several frames with D still held', () =>
      animateFrames(page, 5));

    const whileMenuActive =
      await test.step('capture the state while "menu" is active', () =>
        captureState(page));

    // The "game" group's axis is released as soon as its group is
    // deactivated, so the mover stops even though D is still held.
    expect(whileMenuActive.moverPosition.x).toBe(switchedAway.moverPosition.x);

    await test.step('release D, then switch back to "game"', async () => {
      await page.keyboard.up('KeyD');
      await animateFrames(page, 1);
      await page.evaluate(() =>
        (window.__forgeTestHooks as unknown as Hooks).setActiveGroup('game'),
      );
    });

    const afterSwitchingBack =
      await test.step('capture the state right after switching back', () =>
        captureState(page));

    await test.step('advance several frames with nothing held', () =>
      animateFrames(page, 5));

    const notStuck =
      await test.step('capture the state several frames later', () =>
        captureState(page));

    // This is the "stuck" regression: the key-up happened while "game" was
    // inactive, and used to be dropped, leaving the axis at 1 with nothing
    // held.
    expect(notStuck.moverPosition.x).toBe(afterSwitchingBack.moverPosition.x);

    await test.step('assert the mover square stayed put on screen', () => {
      expect(
        Math.abs(moverCenterX(notStuck) - moverCenterX(afterSwitchingBack)),
      ).toBeLessThan(2);
    });

    await test.step('switch to "menu", press D, then switch back to "game"', async () => {
      await page.evaluate(() =>
        (window.__forgeTestHooks as unknown as Hooks).setActiveGroup('menu'),
      );
      await page.keyboard.down('KeyD');
      await animateFrames(page, 1);
      await page.evaluate(() =>
        (window.__forgeTestHooks as unknown as Hooks).setActiveGroup('game'),
      );
    });

    const pickedUp =
      await test.step('capture the state right after switching back', () =>
        captureState(page));

    await test.step('advance several frames with D still held', () =>
      animateFrames(page, 5));

    const whilePickedUpHeld =
      await test.step('capture the state while D is still held', () =>
        captureState(page));

    // D was pressed while "game" was inactive, but it's still held once
    // "game" is active again, so the mover picks it up straight away.
    expect(whilePickedUpHeld.moverPosition.x).toBeGreaterThan(
      pickedUp.moverPosition.x,
    );

    await test.step('assert the mover square visibly moved right on screen', () => {
      expect(moverCenterX(whilePickedUpHeld)).toBeGreaterThan(
        moverCenterX(pickedUp),
      );
    });

    await test.step('release D', async () => {
      await page.keyboard.up('KeyD');
      await animateFrames(page, 1);
    });

    const afterRelease =
      await test.step('capture the state after releasing D', () =>
        captureState(page));

    await test.step('advance several frames with nothing held', () =>
      animateFrames(page, 5));

    const notReversed =
      await test.step('capture the state several frames later', () =>
        captureState(page));

    // This is the "reversed" regression: the key-down was dropped while
    // "game" was inactive but the key-up wasn't, which used to drive the
    // axis to -1 and leave the mover drifting left with nothing held.
    expect(notReversed.moverPosition.x).toBe(afterRelease.moverPosition.x);

    await test.step('assert the mover square stayed put on screen', () => {
      expect(
        Math.abs(moverCenterX(notReversed) - moverCenterX(afterRelease)),
      ).toBeLessThan(2);
    });
  });
});
