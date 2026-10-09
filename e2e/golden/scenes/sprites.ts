import {
  addPositionComponent,
  addScaleComponent,
  addSpriteComponent,
  Color,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createTransformEcsSystem,
  NineSliceOptions,
  SpriteEcsComponent,
  SpriteRequiredOptions,
  Vector2,
} from '../../../src/index.js';
import type { CreateScene, SceneHandle } from '../../fixtures/scenes/scene.js';
import {
  createComputedTexture,
  createGoldenCamera,
  createGoldenSceneContext,
  createGoldenSceneHandle,
  GoldenSceneContext,
  Texel,
} from '../golden-scene.js';

const cellSize = 56;

// Four columns and two rows of cells, centered on the canvas.
const columns = [-120, -40, 40, 120];
const rows = [56, -56];

const red: Texel = [220, 40, 40, 255];
const green: Texel = [40, 200, 70, 255];
const blue: Texel = [50, 90, 230, 255];
const white: Texel = [255, 255, 255, 255];
const black: Texel = [0, 0, 0, 255];

/**
 * A 16 × 16 texture with a different color in each quadrant and a black
 * border, so a flip on either axis shows as swapped quadrants.
 */
function quadrantTexel(x: number, y: number): Texel {
  if (x === 0 || y === 0 || x === 15 || y === 15) {
    return black;
  }

  if (y < 8) {
    return x < 8 ? red : green;
  }

  return x < 8 ? blue : white;
}

/**
 * A 12 × 12 nine-slice frame: 4-texel borders in a different color per
 * corner and edge, around a checkered center, so stretching and tiling each
 * region shows.
 */
function frameTexel(x: number, y: number): Texel {
  const left = x < 4;
  const right = x >= 8;
  const top = y < 4;
  const bottom = y >= 8;

  if ((left || right) && (top || bottom)) {
    return [240, 170, 30, 255];
  }

  if (left || right) {
    return [180, 60, 200, 255];
  }

  if (top || bottom) {
    return [30, 170, 170, 255];
  }

  return (x + y) % 2 === 0 ? [235, 235, 235, 255] : [150, 150, 150, 255];
}

/**
 * A 16 × 16 greyscale emissive map: a bright ring on black.
 */
function ringTexel(x: number, y: number): Texel {
  const distance = Math.hypot(x - 7.5, y - 7.5);
  const value = distance > 4 && distance < 7 ? 255 : 0;

  return [value, value, value, 255];
}

/**
 * Adds a sprite to the scene.
 * @param context - The scene's context.
 * @param position - The sprite's center, in CSS pixels from the canvas's center.
 * @param sprite - The sprite's options.
 * @param scale - The sprite's local scale; negative flips it.
 */
function addSprite(
  context: GoldenSceneContext,
  position: Vector2,
  sprite: SpriteRequiredOptions & Partial<SpriteEcsComponent>,
  scale: Vector2 = { x: 1, y: 1 },
): void {
  const entity = context.world.createEntity();

  addPositionComponent(context.world, entity, { local: position });
  addScaleComponent(context.world, entity, { local: scale });
  addSpriteComponent(context.world, entity, sprite);
}

/**
 * Sprites drawn every way a sprite's own options change it: plain, tinted,
 * translucent over another sprite, with an emissive map, flipped on each
 * axis by a negative scale, and nine-sliced with stretched and tiled
 * regions.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): SceneHandle => {
  const context = createGoldenSceneContext(container);
  const { world, renderContext } = context;

  createGoldenCamera(context, { clearColor: new Color(0.12, 0.12, 0.16) });

  const quadrants = createComputedTexture(renderContext, 16, 16, quadrantTexel);
  const frame = createComputedTexture(renderContext, 12, 12, frameTexel);
  const ring = createComputedTexture(renderContext, 16, 16, ringTexel);

  const quadrantSprite = {
    texture: quadrants,
    width: cellSize,
    height: cellSize,
  };

  addSprite(context, { x: columns[0], y: rows[0] }, quadrantSprite);
  addSprite(
    context,
    { x: columns[1], y: rows[0] },
    { ...quadrantSprite, tintColor: new Color(1, 0.6, 0.2) },
  );

  // A translucent sprite over the right half of an opaque white one, so the
  // blend shows against both the clear color and the sprite beneath.
  addSprite(
    context,
    { x: columns[2] + 14, y: rows[0] },
    {
      texture: renderContext.whiteTexture,
      width: cellSize / 2,
      height: cellSize + 8,
    },
  );
  addSprite(
    context,
    { x: columns[2], y: rows[0] },
    { ...quadrantSprite, tintColor: new Color(1, 1, 1, 0.5), layer: 1 },
  );

  addSprite(
    context,
    { x: columns[3], y: rows[0] },
    {
      ...quadrantSprite,
      tintColor: new Color(0.3, 0.3, 0.3),
      emissive: { texture: ring, color: new Color(1, 0.8, 0.2) },
    },
  );

  addSprite(context, { x: columns[0], y: rows[1] }, quadrantSprite, {
    x: -1,
    y: 1,
  });
  addSprite(context, { x: columns[1], y: rows[1] }, quadrantSprite, {
    x: 1,
    y: -1,
  });

  const stretchedSlices: NineSliceOptions = {
    left: 12,
    right: 12,
    top: 12,
    bottom: 12,
    nativeWidth: 36,
    nativeHeight: 36,
  };

  addSprite(
    context,
    { x: columns[2], y: rows[1] },
    {
      texture: frame,
      width: cellSize + 8,
      height: cellSize - 8,
      slices: stretchedSlices,
    },
  );
  addSprite(
    context,
    { x: columns[3], y: rows[1] },
    {
      texture: frame,
      width: cellSize + 8,
      height: cellSize,
      slices: { ...stretchedSlices, edgeMode: 'tile', centerMode: 'tile' },
    },
  );

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return createGoldenSceneHandle(context);
};
