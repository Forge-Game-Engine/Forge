import { expect, Page, test } from '@playwright/test';
import type {
  AudioMixerSceneHandle,
  BusName,
} from '../fixtures/scenes/audio-mixer.js';

// See `translucent-ui-compositing.spec.ts` for why the hooks are cast inline
// rather than declared per scene.
type Hooks = AudioMixerSceneHandle;

// Matches `audioMixerSceneReadyMessage` in the scene, which can't be imported
// here as a value: it would pull `/src` into Node (see AGENTS.md).
const sceneReadyMessage = '[audio-mixer] audio context created';

// How often to re-measure while waiting for the level to settle.
const pollIntervalMilliseconds = 50;

// How many measurements must be taken, and how little the last two may
// differ, before a level counts as settled. The first measurements after a
// sound starts or stops can catch audio from before the change.
const minimumMeasurements = 4;
const steadyLevelTolerance = 0.002;

// A level at or below this is silence: a quiet tone at the scene's
// amplitude measures around 0.35.
const silenceLevel = 0.001;

// How far half a bus's volume may measure from half the full level.
// Amplitude scales exactly with gain, so this only absorbs the analyser
// catching slightly different parts of the waveform.
const halfVolumeTolerance = 0.05;

// Each call is its own `page.evaluate`, which runs in the page and can't
// close over anything here.
const scene = (page: Page) => ({
  state: () =>
    page.evaluate(() => (window.__forgeTestHooks as unknown as Hooks).state()),
  playOneShot: () =>
    page.evaluate(() =>
      (window.__forgeTestHooks as unknown as Hooks).playOneShot(),
    ),
  isClickSoundPlaying: () =>
    page.evaluate(() =>
      (window.__forgeTestHooks as unknown as Hooks).isClickSoundPlaying(),
    ),
  startLoop: (bus: BusName) =>
    page.evaluate((name) => {
      (window.__forgeTestHooks as unknown as Hooks).startLoop(name);
    }, bus),
  stopLoop: () =>
    page.evaluate(() => {
      (window.__forgeTestHooks as unknown as Hooks).stopLoop();
    }),
  addSoundEntity: () =>
    page.evaluate(() => {
      const hooks = window.__forgeTestHooks as unknown as Hooks;

      hooks.addSoundEntity();
      hooks.step();
    }),
  removeSoundEntity: () =>
    page.evaluate(() => {
      const hooks = window.__forgeTestHooks as unknown as Hooks;

      hooks.removeSoundEntity();
      hooks.step();
    }),
  measureLevel: () =>
    page.evaluate(() =>
      (window.__forgeTestHooks as unknown as Hooks).measureLevel(),
    ),
});

/** Measures the master bus's level until it stops changing. */
const measureSteadyLevel = async (page: Page): Promise<number> => {
  let measurements = 0;
  let previous = 0;
  let level = 0;

  await expect
    .poll(
      async () => {
        previous = level;
        level = await scene(page).measureLevel();
        measurements++;

        return (
          measurements >= minimumMeasurements &&
          Math.abs(level - previous) < steadyLevelTolerance
        );
      },
      { intervals: [pollIntervalMilliseconds] },
    )
    .toBe(true);

  return level;
};

/** Waits until nothing is audible on the master bus. */
const waitForSilence = (page: Page): Promise<void> =>
  expect
    .poll(() => scene(page).measureLevel(), {
      intervals: [pollIntervalMilliseconds],
    })
    .toBeLessThan(silenceLevel);

/** Plays the tone looping on `bus` and measures the master bus's level. */
const measureBus = async (page: Page, bus: BusName): Promise<number> => {
  await scene(page).startLoop(bus);

  const level = await measureSteadyLevel(page);

  await scene(page).stopLoop();
  await waitForSilence(page);

  return level;
};

// Recording a trace snapshots the page in a way that counts as a user
// gesture, so the browser would start audio unlocked and the spec couldn't
// test unlocking. The video is still recorded.
test.use({ trace: 'off' });

test.describe('sound mixer', () => {
  test.beforeEach(async ({ page }) => {
    await test.step('load the audio-mixer scene', async () => {
      // See `translucent-ui-compositing.spec.ts` for why page errors are
      // captured here.
      let pageError: Error | undefined;

      page.once('pageerror', (error) => {
        pageError = error;
      });

      // Waits on the scene's console message rather than polling the page
      // first; see `audioMixerSceneReadyMessage`.
      const contextCreated = page.waitForEvent('console', {
        predicate: (message) => message.text() === sceneReadyMessage,
      });

      await page.goto('/?scene=audio-mixer');
      await contextCreated;

      try {
        await page.waitForFunction(() => Boolean(window.__forgeTestHooks));
      } catch (timeoutError) {
        throw pageError ?? timeoutError;
      }
    });
  });

  test('unlocks on a click, and buses scale and mute what plays through them', async ({
    page,
  }) => {
    await test.step('audio starts suspended and drops one-shots', async () => {
      // Everything below about the first click depends on this: a browser
      // that let audio run without a gesture would play the one-shot.
      expect(await scene(page).state()).toBe('suspended');
      expect(await scene(page).playOneShot()).toBe(false);
    });

    await test.step('a real click unlocks audio and plays its own sound', async () => {
      await page.mouse.click(100, 100);

      expect(await scene(page).isClickSoundPlaying()).toBe(true);
      await expect.poll(() => scene(page).state()).toBe('running');
      await expect
        .poll(() => scene(page).measureLevel())
        .toBeGreaterThan(silenceLevel);
    });

    await test.step('wait for the click sound to end', async () => {
      await expect
        .poll(() => scene(page).isClickSoundPlaying(), {
          timeout: 5000,
        })
        .toBe(false);
      await waitForSilence(page);
    });

    const full = await test.step('measure the full-volume bus', () =>
      measureBus(page, 'full'));
    const half = await test.step('measure the half-volume bus', () =>
      measureBus(page, 'half'));
    const muted = await test.step('measure the muted bus', () =>
      measureBus(page, 'muted'));

    await test.step('compare the levels', () => {
      expect(full, 'the full bus should be audible').toBeGreaterThan(0.1);
      expect(
        half / full,
        `half volume should measure half the full level (full ${full}, half ${half})`,
      ).toBeGreaterThan(0.5 - halfVolumeTolerance);
      expect(half / full).toBeLessThan(0.5 + halfVolumeTolerance);
      expect(muted, 'the muted bus should be silent').toBeLessThan(
        silenceLevel,
      );
    });
  });

  test("an entity's sound stops when the entity is removed", async ({
    page,
  }) => {
    await page.mouse.click(100, 100);
    await expect.poll(() => scene(page).state()).toBe('running');
    await expect
      .poll(() => scene(page).isClickSoundPlaying(), {
        timeout: 5000,
      })
      .toBe(false);
    await waitForSilence(page);

    const playing = await test.step('add the entity and step', async () => {
      await scene(page).addSoundEntity();

      return measureSteadyLevel(page);
    });

    const removed = await test.step('remove the entity and step', async () => {
      await scene(page).removeSoundEntity();

      return measureSteadyLevel(page);
    });

    expect(playing, 'the entity sound should be audible').toBeGreaterThan(0.1);
    expect(removed, 'removing the entity should silence it').toBeLessThan(
      silenceLevel,
    );
  });
});
