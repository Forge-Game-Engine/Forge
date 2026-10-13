import {
  addPositionComponent,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addDrawOrderComponent,
  addSpriteComponent,
  createCamera,
  createImageSprite,
  createRenderEcsSystem,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { createExhaust, Exhaust } from './_create-exhaust';
import { defaultExhaustSettings, spriteOrders } from './_exhaust-settings';

const renderLayer = 1 << 0;

/** Adds a sprite from an image, `width` world units wide, at a world order. */
async function addImageSprite(
  world: EcsWorld,
  renderContext: RenderContext,
  imagePath: string,
  position: Vector2,
  width: number,
  order: number,
): Promise<void> {
  const texture = await renderContext.textureCache.getOrLoad(
    getAssetUrl(imagePath),
  );
  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: position });
  addSpriteComponent(world, entity, {
    ...createImageSprite(texture, { pixelsPerUnit: texture.width / width }),
    category: renderLayer,
  });
  addDrawOrderComponent(world, entity, { order });
}

/**
 * Builds the meshes demo: a ship over a nebula, an asteroid drifting past,
 * and the ship's exhaust, a mesh that sorts among the three sprites by its
 * layer and world order.
 * @param onExhaustReady - Called with the exhaust once it exists, so the
 * page's settings can change it.
 * @returns The created game.
 */
export const createMeshesGame = async (
  onExhaustReady: (exhaust: Exhaust) => void,
): Promise<Game> => {
  const { game, world, renderContext } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayer,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await addImageSprite(
    world,
    renderContext,
    'img/space-shooter/nebula.png',
    { x: 0, y: 0 },
    1200,
    spriteOrders.background,
  );
  await addImageSprite(
    world,
    renderContext,
    'img/space-shooter/Spaceship_6.png',
    { x: 0, y: 110 },
    170,
    spriteOrders.ship,
  );
  await addImageSprite(
    world,
    renderContext,
    'img/space-shooter/Asteroid_2.png',
    { x: 70, y: -140 },
    120,
    spriteOrders.asteroid,
  );

  // Starts inside the ship's hull, so the ship hides the exhaust's start
  // while the exhaust draws behind it.
  const exhaust = createExhaust(
    world,
    renderContext,
    { x: 0, y: 70 },
    renderLayer,
    defaultExhaustSettings.order,
  );

  onExhaustReady(exhaust);

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
