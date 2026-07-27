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
    ({ blue, yellow, red, green, magenta, orange }) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.step();

      return {
        moverPosition: scene.moverPosition,
        impulsePosition: scene.impulsePosition,
        gameTriggerCount: scene.gameTriggerCount,
        menuTriggerCount: scene.menuTriggerCount,
        isCrouching: scene.isCrouching,
        moverBounds: scene.measureBounds(blue),
        impulseBounds: scene.measureBounds(yellow),
        redMarkerBounds: scene.measureBounds(red),
        greenMarkerBounds: scene.measureBounds(green),
        magentaMarkerBounds: scene.measureBounds(magenta),
        holdBounds: scene.measureBounds(orange),
      };
    },
    {
      blue: inputSceneColors.blue,
      yellow: inputSceneColors.yellow,
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

  test('Axis2dAction with noReset moves continuously while WASD is held, and stops on release', async ({
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

    // noReset means the value is left at whatever it was last set to (0,
    // dispatched by the keyup handler), so movement should have fully
    // stopped instead of continuing or reverting.
    expect(oneMoreStepLater.moverPosition.x).toBe(afterRelease.moverPosition.x);
  });

  test('Axis1dAction with the default zero reset only moves for one frame per key event, even while held', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      captureState(page));

    await test.step('press ArrowRight down and advance one frame', async () => {
      await page.keyboard.down('ArrowRight');
      await animateFrames(page, 1);
    });

    const afterFirstFrame =
      await test.step('capture the state right after the key-down frame', () =>
        captureState(page));

    expect(afterFirstFrame.impulsePosition.x).toBeGreaterThan(
      before.impulsePosition.x,
    );

    await test.step('assert the impulse square visibly jumped right on screen', () => {
      expect(before.impulseBounds).not.toBeNull();
      expect(afterFirstFrame.impulseBounds).not.toBeNull();

      const centerBefore =
        (before.impulseBounds!.left + before.impulseBounds!.right) / 2;
      const centerAfter =
        (afterFirstFrame.impulseBounds!.left +
          afterFirstFrame.impulseBounds!.right) /
        2;

      expect(centerAfter).toBeGreaterThan(centerBefore);
    });

    await test.step('keep holding ArrowRight over several more frames without it moving further', () =>
      animateFrames(page, 8));

    const stillHeld =
      await test.step('capture the state after holding for several more frames', () =>
        captureState(page));

    // The default `actionResetTypes.zero` zeroes the axis value every frame
    // regardless of key state (see actions.md's "Reset behavior" caution),
    // so a held-but-not-newly-pressed key produces no further movement.
    expect(stillHeld.impulsePosition.x).toBe(afterFirstFrame.impulsePosition.x);

    await test.step('release ArrowRight and advance one frame', async () => {
      await page.keyboard.up('ArrowRight');
      await animateFrames(page, 1);
    });

    const afterRelease =
      await test.step('capture the state after release', () =>
        captureState(page));

    // The documented "twitch": because the value had already been reset to
    // 0 while held, the keyup handler's delta computation starts from 0
    // instead of the original +1, producing a compensating -1 impulse on
    // release. Net effect over the whole press-hold-release cycle: the
    // square ends up back where it started.
    expect(afterRelease.impulsePosition.x).toBeCloseTo(
      before.impulsePosition.x,
      5,
    );
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

  test('input groups gate which TriggerAction the same key dispatches to', async ({
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
});
