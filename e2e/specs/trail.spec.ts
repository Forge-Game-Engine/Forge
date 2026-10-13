import { expect, Page, test } from '@playwright/test';
import type {
  PixelExtent,
  TrailMeasurement,
  TrailSceneHandle,
} from '../fixtures/scenes/trail.js';
import {
  trailLifetimeSeconds,
  trailSpeed,
  trailSpriteWidth,
} from '../fixtures/scenes/trail-settings.js';

// See `translucent-ui-compositing.spec.ts` for why the handle is cast
// inline rather than through a global `Window` augmentation.
type Hooks = TrailSceneHandle;

type Action = 'none' | 'stopEmitting' | 'removeTrail';

/**
 * Optionally changes the trail, steps `seconds` of frames of
 * `deltaMilliseconds` and samples the canvas in the same task - see
 * AGENTS.md's "Be wary of pixel-level rendering assertions" for why the
 * steps and the read must happen in one `page.evaluate` call.
 */
const runAndMeasure = (
  page: Page,
  seconds: number,
  deltaMilliseconds: number,
  action: Action = 'none',
): Promise<TrailMeasurement> =>
  page.evaluate(
    ([runSeconds, delta, change]) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      if (change === 'stopEmitting') {
        scene.setEmitting(false);
      }

      if (change === 'removeTrail') {
        scene.removeTrail();
      }

      scene.run(runSeconds, delta);

      return scene.measure();
    },
    [seconds, deltaMilliseconds, action] as const,
  );

const required = (extent: PixelExtent | null, name: string): PixelExtent => {
  if (!extent) {
    throw new Error(`Expected the ${name} shape on the sampled row.`);
  }

  return extent;
};

const width = (extent: PixelExtent): number => extent.right - extent.left + 1;

// Antialiased edges can land a pixel or two either way.
const edgeTolerance = 3;

const loadScene = async (page: Page): Promise<string[]> => {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  await page.goto('/?scene=trail');
  await page.waitForFunction(() => window.__forgeTestHooks !== undefined);

  return errors;
};

/**
 * Measures the trail after moving the entity for twice the trail's
 * lifetime in frames of `deltaMilliseconds`, and checks it's drawn behind
 * the sprite, `trailSpeed × trailLifetimeSeconds` long.
 */
const measureMovingTrail = async (
  page: Page,
  deltaMilliseconds: number,
): Promise<number> => {
  await loadScene(page);

  // One frame: the entity has barely moved, and its sprite covers the
  // start of its trail.
  const start = await runAndMeasure(
    page,
    deltaMilliseconds / 1000,
    deltaMilliseconds,
  );

  expect(start.red).toBeNull();
  required(start.blue, 'blue');

  const moved = await runAndMeasure(
    page,
    2 * trailLifetimeSeconds,
    deltaMilliseconds,
  );
  const red = required(moved.red, 'red');
  const blue = required(moved.blue, 'blue');
  const pixelsPerUnit = width(blue) / trailSpriteWidth;

  // The trail runs up to the entity and the sprite covers its head: the
  // trail is drawn behind its own entity's sprite.
  expect(Math.abs(red.right + 1 - blue.left)).toBeLessThanOrEqual(
    edgeTolerance,
  );

  // From the sprite's left edge back to where the entity was a lifetime
  // ago.
  const expectedLength =
    (trailSpeed * trailLifetimeSeconds - trailSpriteWidth / 2) *
    pixelsPerUnit;

  expect(Math.abs(width(red) - expectedLength)).toBeLessThanOrEqual(
    edgeTolerance,
  );

  return width(red);
};

test('a moving entity leaves a trail as long as its path over the lifetime, the same at any frame rate', async ({
  page,
}) => {
  const at60 = await test.step('move at 60 frames a second', () =>
    measureMovingTrail(page, 16.6666),
  );
  const at144 = await test.step('move again at about 144 frames a second', () =>
    measureMovingTrail(page, 7),
  );

  expect(Math.abs(at60 - at144)).toBeLessThanOrEqual(edgeTolerance);
});

test('a trail that stops emitting fades out after its lifetime', async ({
  page,
}) => {
  await loadScene(page);

  const moving = await runAndMeasure(page, trailLifetimeSeconds, 16.6666);

  required(moving.red, 'red');

  const halfway = await test.step('stop emitting, half a lifetime', () =>
    runAndMeasure(page, trailLifetimeSeconds / 2, 16.6666, 'stopEmitting'),
  );

  // The tail has shortened while the entity moved on without it.
  expect(width(required(halfway.red, 'red'))).toBeLessThan(
    width(required(moving.red, 'red')),
  );

  const faded = await test.step('a lifetime later', () =>
    runAndMeasure(page, trailLifetimeSeconds, 16.6666),
  );

  expect(faded.red).toBeNull();
  required(faded.blue, 'blue');
});

test('removing the trail component removes its ribbon at once', async ({
  page,
}) => {
  const errors = await loadScene(page);

  const moving = await runAndMeasure(page, trailLifetimeSeconds, 16.6666);

  required(moving.red, 'red');

  const removed = await runAndMeasure(page, 1 / 60, 16.6666, 'removeTrail');

  expect(removed.red).toBeNull();
  required(removed.blue, 'blue');
  expect(errors).toEqual([]);
});
