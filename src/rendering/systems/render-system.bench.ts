import { bench, describe } from 'vitest';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Random } from '../../math/index.js';
import { addSpriteComponent } from '../components/index.js';
import type { SpriteMaterial } from '../materials/sprite-material.js';
import { createNoOpRenderContext } from '../test-helpers/no-op-render-context.js';
import { Texture } from '../texture.js';
import { createCamera } from '../utilities/index.js';
import { createRenderEcsSystem } from './render-system.js';

const spriteCounts = [1_000, 10_000, 100_000];
const textureCount = 20;
const canvasWidth = 800;
const canvasHeight = 600;

// One world unit per CSS pixel.
const verticalWorldUnits = canvasHeight;

// A tenth of the sprites are placed outside the camera's view, so culling
// has something to drop.
const offscreenFraction = 0.1;

/**
 * Builds a world with one camera and `count` rotated, scaled sprites spread
 * over {@link textureCount} textures, each texture's sprites on their own
 * layer, so the draw order sorts them into one batch per texture. The
 * render context draws to a no-op WebGL context, so a frame measures
 * everything the render system does on the CPU: collecting and sorting the
 * sprites, building their commands, culling and packing instance data.
 */
function createSpriteWorld(count: number): EcsWorld {
  const renderContext = createNoOpRenderContext(canvasWidth, canvasHeight);
  const world = new EcsWorld();
  const random = new Random('render-system-bench');

  // The render system binds a material once per batch, and a real
  // `SpriteMaterial` needs compiled shaders, which Node can't provide, so
  // the sprites draw with a stand-in that does nothing.
  const material = {
    program: {},
    setUniform: (): void => undefined,
    bindSprites: (): number => 0,
  } as unknown as SpriteMaterial;
  const textures = Array.from(
    { length: textureCount },
    () => new Texture(renderContext),
  );

  createCamera(world, { isStatic: true, verticalWorldUnits });

  const halfHeight = verticalWorldUnits / 2;
  const halfWidth = (halfHeight * canvasWidth) / canvasHeight;

  for (let i = 0; i < count; i++) {
    const entity = world.createEntity();
    const offscreenOffset = i < count * offscreenFraction ? 4 * halfWidth : 0;

    addPositionComponent(world, entity, {
      local: {
        x: random.randomFloat(-halfWidth, halfWidth) + offscreenOffset,
        y: random.randomFloat(-halfHeight, halfHeight),
      },
    });
    addRotationComponent(world, entity, { local: random.randomFloat(0, 6) });
    addScaleComponent(world, entity, { local: { x: 0.5, y: 0.5 } });
    addSpriteComponent(world, entity, {
      texture: textures[i % textureCount],
      width: 16,
      height: 16,
      material,
      layer: i % textureCount,
    });
  }

  world.addSystem(createRenderEcsSystem(renderContext));

  return world;
}

describe('render system, sprites', () => {
  for (const count of spriteCounts) {
    const world = createSpriteWorld(count);

    bench(`${count.toLocaleString('en-US')} sprites`, () => {
      world.update();
    });
  }
});
