import { expect, test } from '@playwright/test';
import { inputSceneColors } from '../fixtures/scenes/input-scene-colors.js';
import type { MouseInputSceneHandle } from '../fixtures/scenes/mouse-input.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`. Each `page.evaluate` callback below narrows it to this
// spec's own scene handle type inline - see camera-pan-zoom.spec.ts's `Hooks`
// comment for why.
type Hooks = MouseInputSceneHandle;
type Page = import('@playwright/test').Page;

// The fixture's #app container - and therefore the canvas - is 800x600 and
// sits at the page's top-left corner (see e2e/fixtures/index.html), so page
// coordinates map 1:1 onto canvas coordinates.
const canvasWidth = 800;
const canvasHeight = 600;
const canvasCenterX = canvasWidth / 2;
const canvasCenterY = canvasHeight / 2;

const captureState = (page: Page) =>
  page.evaluate(
    ({ blue, yellow, red, green, magenta, orange }) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.step();

      return {
        pointerPosition: scene.pointerPosition,
        scrollPosition: scene.scrollPosition,
        gameTriggerCount: scene.gameTriggerCount,
        menuTriggerCount: scene.menuTriggerCount,
        isAiming: scene.isAiming,
        pointerBounds: scene.measureBounds(blue),
        scrollBounds: scene.measureBounds(yellow),
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

test.describe('mouse input', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the mouse-input scene', async () => {
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      await page.goto('/?scene=mouse-input');

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }

      // Establishes the cursor's starting ratio at dead center before any
      // test-specific movement, so every test starts from the same known
      // `pointerAction.value` of (0, 0).
      await page.mouse.move(canvasCenterX, canvasCenterY);
      await step(page);
    });
  });

  test('Axis2dAction with noReset tracks the cursor and holds position between mousemove events', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      captureState(page));

    await test.step('move the mouse toward the right edge of the canvas', async () => {
      await page.mouse.move(canvasWidth - 50, canvasCenterY);
      await animateFrames(page, 3);
    });

    const afterMove = await test.step('capture the state after moving', () =>
      captureState(page));

    expect(afterMove.pointerPosition.x).toBeGreaterThan(
      before.pointerPosition.x,
    );

    await test.step('assert the pointer square visibly moved right on screen', () => {
      expect(before.pointerBounds).not.toBeNull();
      expect(afterMove.pointerBounds).not.toBeNull();

      const centerBefore =
        (before.pointerBounds!.left + before.pointerBounds!.right) / 2;
      const centerAfterMove =
        (afterMove.pointerBounds!.left + afterMove.pointerBounds!.right) / 2;

      expect(centerAfterMove).toBeGreaterThan(centerBefore);
    });

    await test.step('advance several more frames without moving the mouse further', () =>
      animateFrames(page, 5));

    const stillStill =
      await test.step('capture the state after holding the cursor still', () =>
        captureState(page));

    // noReset means the last-dispatched ratio persists, so the square keeps
    // tracking the same position instead of drifting or snapping back.
    expect(stillStill.pointerPosition.x).toBe(afterMove.pointerPosition.x);
  });

  test('Axis1dAction with the default zero reset only moves for one frame per wheel event', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      captureState(page));

    await test.step('scroll the wheel once and advance one frame', async () => {
      await page.locator('canvas').dispatchEvent('wheel', { deltaY: -100 });
      await animateFrames(page, 1);
    });

    const afterScroll =
      await test.step('capture the state right after the scroll frame', () =>
        captureState(page));

    expect(afterScroll.scrollPosition.x).not.toBe(before.scrollPosition.x);

    await test.step('assert the scroll square visibly moved on screen', () => {
      expect(before.scrollBounds).not.toBeNull();
      expect(afterScroll.scrollBounds).not.toBeNull();

      const centerBefore =
        (before.scrollBounds!.left + before.scrollBounds!.right) / 2;
      const centerAfterScroll =
        (afterScroll.scrollBounds!.left + afterScroll.scrollBounds!.right) / 2;

      expect(centerAfterScroll).not.toBe(centerBefore);
    });

    await test.step('advance several more frames without scrolling again', () =>
      animateFrames(page, 6));

    const stillAfter =
      await test.step('capture the state after several more frames', () =>
        captureState(page));

    // The default `actionResetTypes.zero` zeroes the axis value every frame
    // - correct here, since a wheel event has no "up" counterpart to reverse
    // a lingering value the way a key or button release would.
    expect(stillAfter.scrollPosition.x).toBe(afterScroll.scrollPosition.x);
  });

  test('TriggerAction fires once per click, not per frame held', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      captureState(page));

    expect(before.gameTriggerCount).toBe(0);

    await test.step('press and hold the left button over several frames', async () => {
      await page.mouse.move(canvasCenterX, canvasCenterY);
      await page.mouse.down({ button: 'left' });
      await animateFrames(page, 6);
    });

    const whileHeld = await test.step('capture the state while held', () =>
      captureState(page));

    expect(whileHeld.gameTriggerCount).toBe(1);

    await test.step('assert the marker square turned green on screen', () => {
      expect(whileHeld.greenMarkerBounds).not.toBeNull();
      expect(whileHeld.redMarkerBounds).toBeNull();
    });

    await test.step('release and click again', async () => {
      await page.mouse.up({ button: 'left' });
      await animateFrames(page, 2);
      await page.mouse.down({ button: 'left' });
      await animateFrames(page, 2);
      await page.mouse.up({ button: 'left' });
      await animateFrames(page, 1);
    });

    const afterSecondClick =
      await test.step('capture the state after the second click', () =>
        captureState(page));

    expect(afterSecondClick.gameTriggerCount).toBe(2);

    await test.step('assert the marker square toggled back to red on screen', () => {
      expect(afterSecondClick.redMarkerBounds).not.toBeNull();
      expect(afterSecondClick.greenMarkerBounds).toBeNull();
    });
  });

  test('HoldAction grows the square while the right button is held, and shrinks it back on release', async ({
    page,
  }) => {
    const before = await test.step('capture the starting state', () =>
      captureState(page));

    expect(before.isAiming).toBe(false);
    expect(before.holdBounds).not.toBeNull();

    const widthBefore = before.holdBounds!.right - before.holdBounds!.left;

    await test.step('press and hold the right button', async () => {
      await page.mouse.move(canvasCenterX, canvasCenterY);
      await page.mouse.down({ button: 'right' });
      await animateFrames(page, 4);
    });

    const whileHeld = await test.step('capture the state while held', () =>
      captureState(page));

    expect(whileHeld.isAiming).toBe(true);

    const widthWhileHeld =
      whileHeld.holdBounds!.right - whileHeld.holdBounds!.left;

    expect(widthWhileHeld).toBeGreaterThan(widthBefore);

    await test.step('release the right button', async () => {
      await page.mouse.up({ button: 'right' });
      await animateFrames(page, 1);
    });

    const afterRelease =
      await test.step('capture the state after release', () =>
        captureState(page));

    expect(afterRelease.isAiming).toBe(false);

    const widthAfterRelease =
      afterRelease.holdBounds!.right - afterRelease.holdBounds!.left;

    // Generous tolerance for antialiased edge pixels, not an exact byte
    // match - see input-scene-helpers.ts's `colorMatchTolerance`.
    expect(Math.abs(widthAfterRelease - widthBefore)).toBeLessThan(4);
  });

  test('input groups gate which TriggerAction the same button dispatches to, including for MouseInputSource', async ({
    page,
  }) => {
    const initial = await test.step('capture the starting state', () =>
      captureState(page));

    expect(initial.gameTriggerCount).toBe(0);
    expect(initial.menuTriggerCount).toBe(0);

    await test.step('click the left button while the "game" group is active', async () => {
      await page.mouse.move(canvasCenterX, canvasCenterY);
      await page.mouse.down({ button: 'left' });
      await animateFrames(page, 2);
      await page.mouse.up({ button: 'left' });
      await animateFrames(page, 1);
    });

    const afterGameClick =
      await test.step('capture the state after the "game"-group click', () =>
        captureState(page));

    // This is the regression this test guards: MouseInputSource used to
    // call `TriggerAction.trigger()` directly, bypassing InputManager's
    // active-group gating entirely (unlike KeyboardInputSource). If that
    // regressed, `menuTriggerCount` below would be 1 even though the
    // "menu" group was never active.
    expect(afterGameClick.gameTriggerCount).toBe(1);
    expect(afterGameClick.menuTriggerCount).toBe(0);
    expect(afterGameClick.magentaMarkerBounds).toBeNull();

    await test.step('switch the active group to "menu"', () =>
      page.evaluate(() =>
        (window.__forgeTestHooks as unknown as Hooks).setActiveGroup('menu'),
      ));

    await test.step('click the left button while the "menu" group is active', async () => {
      await page.mouse.down({ button: 'left' });
      await animateFrames(page, 2);
      await page.mouse.up({ button: 'left' });
      await animateFrames(page, 1);
    });

    const afterMenuClick =
      await test.step('capture the state after the "menu"-group click', () =>
        captureState(page));

    // The "game" trigger must not have fired again - only its group's
    // dispatch was gated, proving the gate is per-binding, not global.
    expect(afterMenuClick.gameTriggerCount).toBe(1);
    expect(afterMenuClick.menuTriggerCount).toBe(1);

    await test.step('assert the marker square turned magenta on screen', () => {
      expect(afterMenuClick.magentaMarkerBounds).not.toBeNull();
    });

    await test.step('switch back to "game" and click once more', async () => {
      await page.evaluate(() =>
        (window.__forgeTestHooks as unknown as Hooks).setActiveGroup('game'),
      );
      await page.mouse.down({ button: 'left' });
      await animateFrames(page, 2);
      await page.mouse.up({ button: 'left' });
      await animateFrames(page, 1);
    });

    const afterSwitchingBack =
      await test.step('capture the state after switching back to "game"', () =>
        captureState(page));

    expect(afterSwitchingBack.gameTriggerCount).toBe(2);
    expect(afterSwitchingBack.menuTriggerCount).toBe(1);
  });
});
