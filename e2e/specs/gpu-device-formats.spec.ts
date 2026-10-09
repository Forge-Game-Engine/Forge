import { expect, test } from '@playwright/test';
import type {
  FormatMeasurement,
  FormatSceneHandle,
} from '../fixtures/scenes/gpu-device-formats.js';

type Hooks = FormatSceneHandle;
type Rgba = readonly [number, number, number, number];

const distance = (a: Rgba, b: Rgba): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Whether a cell looks like the passing control rather than the failing
 * one, both drawn in the same frame.
 */
const passes = (cell: Rgba, measurement: FormatMeasurement): boolean =>
  distance(cell, measurement.passControl) <
  distance(cell, measurement.failControl);

test.describe('GPU device formats', () => {
  test('creates, uploads and samples every texture format the device has', async ({
    page,
  }) => {
    const pageErrors: string[] = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/?scene=gpu-device-formats');
    await page.waitForFunction(() => window.__forgeTestHooks !== undefined);

    const measurement = await page.evaluate(() => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.step();

      return scene.measure();
    });

    // The controls are told apart, so a cell's color says which it matches.
    expect(
      distance(measurement.passControl, measurement.failControl),
    ).toBeGreaterThan(100);

    const failures = Object.entries(measurement.checks)
      .filter(([, cell]) => cell !== null && !passes(cell, measurement))
      .map(([name]) => name);
    const unavailable = Object.entries(measurement.checks)
      .filter(([, cell]) => cell === null)
      .map(([name]) => name);

    expect(failures).toEqual([]);
    // Only compressed formats may be missing from a device.
    expect(unavailable.every((name) => name.startsWith('bc'))).toBe(true);
    expect(pageErrors).toEqual([]);
  });
});
