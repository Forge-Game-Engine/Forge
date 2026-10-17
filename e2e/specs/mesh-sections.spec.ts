import { expect, test } from '@playwright/test';
import type {
  MeshSectionsMeasurement,
  MeshSectionsSceneHandle,
  PixelExtent,
} from '../fixtures/scenes/mesh-sections.js';

// See `translucent-ui-compositing.spec.ts` for why the handle is cast
// inline rather than through a global `Window` augmentation.
type Hooks = MeshSectionsSceneHandle;

/**
 * Shows or hides the character, steps one frame and samples the canvas in
 * the same task - see AGENTS.md's "Be wary of pixel-level rendering
 * assertions" for why `step()` and the read must happen in one
 * `page.evaluate` call.
 */
const captureMeasurement = (
  page: import('@playwright/test').Page,
  characterVisible: boolean,
): Promise<MeshSectionsMeasurement> =>
  page.evaluate((visible) => {
    const scene = window.__forgeTestHooks as unknown as Hooks;

    scene.setCharacterVisible(visible);
    scene.step();

    return scene.measure();
  }, characterVisible);

const required = (extent: PixelExtent | null, name: string): PixelExtent => {
  if (!extent) {
    throw new Error(`Expected ${name} on the sampled row.`);
  }

  return extent;
};

// Antialiased edges can land a pixel either way.
const edgeTolerance = 2;

test.beforeEach(async ({ page }) => {
  await page.goto('/?scene=mesh-sections');
  await page.waitForFunction(() => window.__forgeTestHooks !== undefined);
});

test('walls drawing sections of one geometry merge into one draw, split around a character sorted between them', async ({
  page,
}) => {
  const hidden =
    await test.step('measure the walls without the character', () =>
      captureMeasurement(page, false));

  await test.step('the four walls draw in one call, each in its place', () => {
    expect(hidden.meshDrawCalls).toBe(1);
    expect(hidden.extents.character).toBeNull();

    const walls = [0, 1, 2, 3].map((wall) =>
      required(
        hidden.extents[`wall${wall}` as keyof typeof hidden.extents],
        `wall ${wall}`,
      ),
    );

    // Each wall covers the one before it, so they appear left to right,
    // each starting where the previous one stops.
    for (let wall = 1; wall < walls.length; wall++) {
      expect(
        Math.abs(walls[wall].left - (walls[wall - 1].right + 1)),
      ).toBeLessThanOrEqual(edgeTolerance);
    }
  });

  const hiddenWall1 = required(hidden.extents.wall1, 'wall 1');
  const hiddenWall2 = required(hidden.extents.wall2, 'wall 2');

  const shown =
    await test.step('show the character between walls 1 and 2', () =>
      captureMeasurement(page, true));

  await test.step('the character covers wall 1, and wall 2 covers the character', () => {
    expect(shown.meshDrawCalls).toBe(2);

    const wall1 = required(shown.extents.wall1, 'wall 1');
    const character = required(shown.extents.character, 'the character');
    const wall2 = required(shown.extents.wall2, 'wall 2');

    // The character hides the end of wall 1 that it overlaps.
    expect(Math.abs(wall1.left - hiddenWall1.left)).toBeLessThanOrEqual(
      edgeTolerance,
    );
    expect(wall1.right).toBeLessThan(hiddenWall1.right - 10);
    expect(Math.abs(character.left - (wall1.right + 1))).toBeLessThanOrEqual(
      edgeTolerance,
    );

    // Wall 2 is untouched, and the character stops where it starts.
    expect(Math.abs(wall2.left - hiddenWall2.left)).toBeLessThanOrEqual(
      edgeTolerance,
    );
    expect(Math.abs(wall2.right - hiddenWall2.right)).toBeLessThanOrEqual(
      edgeTolerance,
    );
    expect(Math.abs(character.right + 1 - wall2.left)).toBeLessThanOrEqual(
      edgeTolerance,
    );
  });
});
