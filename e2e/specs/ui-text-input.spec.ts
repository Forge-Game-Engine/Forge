import { expect, test } from '@playwright/test';
import type { UiTextInputSceneHandle } from '../fixtures/scenes/ui-text-input.js';

type Hooks = UiTextInputSceneHandle;
type Page = import('@playwright/test').Page;

const capture = (page: Page) =>
  page.evaluate(() => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.step();

    const ink = scene.measureTextInk();

    return {
      value: scene.value,
      isEditing: scene.isEditing,
      submittedValues: scene.submittedValues,
      cancelCount: scene.cancelCount,
      isButtonFocused: scene.isButtonFocused,
      inkWidth: ink ? ink.right - ink.left : 0,
    };
  });

/** Steps a few frames so the typed text is shaped, laid out and drawn. */
const settle = async (page: Page) => {
  for (let frame = 0; frame < 3; frame++) {
    // eslint-disable-next-line no-await-in-loop
    await capture(page);
  }

  return capture(page);
};

const clickField = async (page: Page) => {
  const center = await page.evaluate(
    () => (window.__forgeTestHooks as unknown as Hooks).fieldCenter,
  );

  await page.mouse.click(center.x, center.y);
};

test.describe('ui text input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?scene=ui-text-input');
    await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
    await settle(page);
  });

  test('clicking the field and typing draws the typed text', async ({
    page,
  }) => {
    const empty = await settle(page);

    expect(empty.inkWidth).toBe(0);

    await clickField(page);
    expect((await settle(page)).isEditing).toBe(true);

    await page.keyboard.type('Ada');

    const short = await settle(page);

    expect(short.value).toBe('Ada');
    expect(short.inkWidth).toBeGreaterThan(0);

    await page.keyboard.type(' Lovelace');

    const long = await settle(page);

    expect(long.value).toBe('Ada Lovelace');
    // Relative, same-run measurement: the drawn text gets wider as the
    // value gets longer.
    expect(long.inkWidth).toBeGreaterThan(short.inkWidth * 2);
  });

  test('Enter submits once even when held, and ends editing', async ({
    page,
  }) => {
    await clickField(page);
    await settle(page);
    await page.keyboard.type('Ada');
    await settle(page);

    await page.keyboard.down('Enter');
    await page.keyboard.down('Enter');
    await page.keyboard.down('Enter');

    const submitted = await settle(page);

    await page.keyboard.up('Enter');

    expect(submitted.submittedValues).toEqual(['Ada']);
    expect(submitted.isEditing).toBe(false);
  });

  test('Escape cancels, keeping the value', async ({ page }) => {
    await clickField(page);
    await settle(page);
    await page.keyboard.type('Ada');
    await page.keyboard.press('Escape');

    const cancelled = await settle(page);

    expect(cancelled.cancelCount).toBe(1);
    expect(cancelled.value).toBe('Ada');
    expect(cancelled.isEditing).toBe(false);
  });

  test('keys typed into the field do not move UI focus or press the focused element', async ({
    page,
  }) => {
    await clickField(page);
    await settle(page);
    await page.evaluate(() =>
      (window.__forgeTestHooks as unknown as Hooks).focusButton(),
    );

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type('x');

    const typed = await settle(page);

    expect(typed.isButtonFocused).toBe(true);
    expect(typed.isEditing).toBe(true);
    expect(typed.value).toBe('x');
  });

  test('hovering another element does not end editing', async ({ page }) => {
    await clickField(page);
    await settle(page);

    const button = await page.evaluate(
      () => (window.__forgeTestHooks as unknown as Hooks).buttonCenter,
    );

    await page.mouse.move(button.x, button.y);

    const hovered = await settle(page);

    expect(hovered.isButtonFocused).toBe(true);
    expect(hovered.isEditing).toBe(true);
  });

  test('a tap on a panel covering the field does not start editing it', async ({
    page,
  }) => {
    await page.evaluate(() =>
      (window.__forgeTestHooks as unknown as Hooks).setCoverVisible(true),
    );
    await settle(page);
    await clickField(page);

    expect((await settle(page)).isEditing).toBe(false);
  });
});
