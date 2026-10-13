import { expect, test } from '@playwright/test';
import type {
  MeshDrawOrderMeasurement,
  MeshDrawOrderSceneHandle,
  PixelExtent,
} from '../fixtures/scenes/mesh-draw-order.js';

// See `translucent-ui-compositing.spec.ts` for why the handle is cast
// inline rather than through a global `Window` augmentation.
type Hooks = MeshDrawOrderSceneHandle;

/**
 * Sets the mesh's visibility and draw order, steps one frame and samples
 * the canvas in the same task - see AGENTS.md's "Be wary of pixel-level
 * rendering assertions" for why `step()` and the read must happen in one
 * `page.evaluate` call.
 */
const captureMeasurement = (
  page: import('@playwright/test').Page,
  meshVisible: boolean,
  meshOrder: number,
): Promise<MeshDrawOrderMeasurement> =>
  page.evaluate(
    ([visible, order]) => {
      const scene = window.__forgeTestHooks as unknown as Hooks;

      scene.setMeshVisible(visible);
      scene.setMeshOrder(order);
      scene.step();

      return scene.measure();
    },
    [meshVisible, meshOrder] as const,
  );

const required = (extent: PixelExtent | null, name: string): PixelExtent => {
  if (!extent) {
    throw new Error(`Expected the ${name} shape on the sampled row.`);
  }

  return extent;
};

// Antialiased edges can land a pixel either way.
const edgeTolerance = 2;

test.beforeEach(async ({ page }) => {
  await page.goto('/?scene=mesh-draw-order');
  await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
});

test('a mesh with a world order between two sprites draws over one and under the other', async ({
  page,
}) => {
  const hidden = await test.step('measure the sprites without the mesh', () =>
    captureMeasurement(page, false, 1));

  expect(hidden.green).toBeNull();

  const hiddenRed = required(hidden.red, 'red');
  const hiddenBlue = required(hidden.blue, 'blue');

  const between = await test.step('show the mesh between them', () =>
    captureMeasurement(page, true, 1));

  await test.step('the mesh covers A, and B covers the mesh', () => {
    expect(between.meshOrder).toBe(1);

    const red = required(between.red, 'red');
    const green = required(between.green, 'green');
    const blue = required(between.blue, 'blue');

    // The mesh hides the end of sprite A that it overlaps.
    expect(red.right).toBeLessThan(hiddenRed.right - 10);
    expect(Math.abs(green.left - (red.right + 1))).toBeLessThanOrEqual(
      edgeTolerance,
    );

    // Sprite B is untouched, and the mesh stops where it starts.
    expect(Math.abs(blue.left - hiddenBlue.left)).toBeLessThanOrEqual(
      edgeTolerance,
    );
    expect(Math.abs(green.right + 1 - blue.left)).toBeLessThanOrEqual(
      edgeTolerance,
    );
  });

  const inFront = await test.step('move the mesh after sprite B', () =>
    captureMeasurement(page, true, 3));

  await test.step('the mesh now covers sprite B too', () => {
    expect(inFront.meshOrder).toBe(3);

    const green = required(inFront.green, 'green');
    const blue = required(inFront.blue, 'blue');

    expect(blue.left).toBeGreaterThan(hiddenBlue.left + 10);
    expect(green.right).toBeGreaterThan(hiddenBlue.left + 10);
  });
});
