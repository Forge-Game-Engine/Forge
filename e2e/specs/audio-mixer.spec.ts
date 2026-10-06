import { expect, test } from '@playwright/test';
import type {
  AudioMixerBusName,
  AudioMixerSceneHandle,
} from '../fixtures/scenes/audio-mixer.js';

// `window.__forgeTestHooks` is declared globally (as the base `SceneHandle`)
// by `harness.ts`; each `page.evaluate` callback narrows it to this scene's
// handle inline - see camera-pan-zoom.spec.ts's `Hooks` comment for why.
type Hooks = AudioMixerSceneHandle;
type Page = import('@playwright/test').Page;

const measurePlaySoundLevel = (page: Page, bus: AudioMixerBusName) =>
  page.evaluate(
    (busName) =>
      (window.__forgeTestHooks as unknown as Hooks).measurePlaySoundLevel(
        busName,
      ),
    bus,
  );

const unlockAudio = async (page: Page): Promise<void> => {
  await page.locator('#app').click();
  await expect
    .poll(() =>
      page.evaluate(() => (window.__forgeTestHooks as unknown as Hooks).state),
    )
    .toBe('running');
};

test.describe('audio mixer', () => {
  test.beforeEach(async ({ page }) => {
    const pageErrors: Error[] = [];

    page.on('pageerror', (error) => pageErrors.push(error));

    await page.goto('/?scene=audio-mixer');

    try {
      await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
    } catch (error) {
      throw pageErrors[0] ?? error;
    }
  });

  test('a click resumes a suspended mixer', async ({ page }) => {
    expect(
      await page.evaluate(
        () => (window.__forgeTestHooks as unknown as Hooks).state,
      ),
    ).toBe('suspended');

    await unlockAudio(page);
  });

  test('bus volume and mute scale what reaches the master bus', async ({
    page,
  }) => {
    await unlockAudio(page);

    const full = await measurePlaySoundLevel(page, 'full');
    const half = await measurePlaySoundLevel(page, 'half');
    const muted = await measurePlaySoundLevel(page, 'muted');

    expect(full).toBeGreaterThan(0.1);
    expect(half / full).toBeGreaterThan(0.4);
    expect(half / full).toBeLessThan(0.6);
    expect(muted / full).toBeLessThan(0.01);
  });

  test('removing an entity stops its sound', async ({ page }) => {
    await unlockAudio(page);

    const playing = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.addSoundEntity();
      scene.step();

      return scene.measureLevel();
    });

    const removed = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.removeSoundEntity();
      scene.step();

      return scene.measureLevel();
    });

    expect(playing).toBeGreaterThan(0.1);
    expect(removed / playing).toBeLessThan(0.01);
  });
});
