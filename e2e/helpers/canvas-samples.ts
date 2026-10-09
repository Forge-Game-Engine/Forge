import { expect, type Page } from '@playwright/test';
import { withDefaults } from '../../src/utilities/with-defaults.js';

/**
 * Where to sample the canvas, as fractions of its size: `x` from the left
 * edge, `y` from the bottom edge (Y-up, like the engine), so a spec never
 * hardcodes a pixel coordinate.
 */
export interface CanvasPoint {
  x: number;
  y: number;
}

/** A sampled color, `0`-`1` per channel, straight alpha. */
export interface SampledColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** A sample: the average color of a small block, and how uniform it was. */
export interface CanvasSample extends SampledColor {
  /**
   * The largest difference, in any channel, between one pixel of the block
   * and the block's average. A large spread means the block straddles an
   * edge, so the sample doesn't measure one region.
   */
  spread: number;
}

/** Options for {@link sampleCanvas}. */
export interface SampleCanvasOptions {
  /**
   * The block averaged around each point extends this many device pixels
   * each way (default: `2`, a 5 × 5 block).
   */
  radius?: number;
}

const defaultSampleCanvasOptions = { radius: 2 };

/**
 * Reads back the page's canvas and averages a small block of device pixels
 * around each point.
 *
 * The canvas must keep its drawing buffer after a frame is presented
 * (`createRenderContext(canvas, { preserveDrawingBuffer: true })`, as every
 * golden and analytic scene does), since this reads it in its own
 * `page.evaluate`, after the frame that drew it.
 * @param page - The page holding the canvas.
 * @param points - Where to sample.
 * @param options - How large a block to average.
 * @returns One sample per point, in order.
 */
export function sampleCanvas(
  page: Page,
  points: readonly CanvasPoint[],
  options: SampleCanvasOptions = {},
): Promise<CanvasSample[]> {
  const { radius } = withDefaults(defaultSampleCanvasOptions, options);

  return page.evaluate(
    ({ points: browserPoints, radius: browserRadius }) => {
      const canvas = document.querySelector('canvas');

      if (!canvas) {
        throw new Error('The page has no canvas to sample.');
      }

      const readback = document.createElement('canvas');

      readback.width = canvas.width;
      readback.height = canvas.height;

      const context2d = readback.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const size = browserRadius * 2 + 1;

      return browserPoints.map(({ x, y }) => {
        const left = Math.round(x * canvas.width) - browserRadius;
        const top = Math.round((1 - y) * canvas.height) - browserRadius;
        const { data } = context2d.getImageData(left, top, size, size);
        const count = size * size;
        const sums = [0, 0, 0, 0];

        for (let i = 0; i < data.length; i++) {
          sums[i % 4] += data[i];
        }

        const means = sums.map((sum) => sum / count);
        let spread = 0;

        for (let i = 0; i < data.length; i++) {
          spread = Math.max(spread, Math.abs(data[i] - means[i % 4]));
        }

        return {
          r: means[0] / 255,
          g: means[1] / 255,
          b: means[2] / 255,
          a: means[3] / 255,
          spread: spread / 255,
        };
      });
    },
    { points: [...points], radius },
  );
}

/** A color to compare a sample with; alpha is checked only when given. */
export interface ExpectedColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/**
 * Asserts that a sample is uniform and within `tolerance` of a computed
 * color in every channel.
 * @param sample - The sample, from {@link sampleCanvas}.
 * @param expected - The computed color, `0`-`1` per channel.
 * @param tolerance - The largest allowed difference per channel, `0`-`1`.
 * Leave room for 8-bit rounding (`1 / 255` per write).
 * @param label - Names the sample in a failure message.
 */
export function expectColorClose(
  sample: CanvasSample,
  expected: ExpectedColor,
  tolerance: number,
  label: string,
): void {
  const details = `${label}: sampled ${JSON.stringify(sample)}, expected ${JSON.stringify(expected)} ± ${tolerance}`;

  expect(
    sample.spread,
    `${details}. The sample isn't uniform, so it straddles an edge; sample the middle of a region.`,
  ).toBeLessThanOrEqual(tolerance);

  const channels = ['r', 'g', 'b', 'a'] as const;

  for (const channel of channels) {
    const expectedValue = expected[channel];

    if (expectedValue === undefined) {
      continue;
    }

    expect(
      Math.abs(sample[channel] - expectedValue),
      `${details} (channel ${channel})`,
    ).toBeLessThanOrEqual(tolerance);
  }
}

/**
 * Asserts that two samples of the same frame are within `tolerance` of each
 * other in every channel: a relative check, for regions that should match.
 * @param sample - One sample.
 * @param other - The sample it should match.
 * @param tolerance - The largest allowed difference per channel, `0`-`1`.
 * @param label - Names the comparison in a failure message.
 */
export function expectSamplesClose(
  sample: CanvasSample,
  other: CanvasSample,
  tolerance: number,
  label: string,
): void {
  expectColorClose(sample, other, tolerance, label);
}
