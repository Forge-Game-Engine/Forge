import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';
import {
  addSpriteComponent,
  createImageSprite,
  createTexture,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { spinId } from './_spin.system';

/**
 * Creates a spinning planet. Its texture keeps the image it was made from,
 * so the engine can upload it again after a lost context is restored.
 */
export async function createPlanet(
  world: EcsWorld,
  renderContext: RenderContext,
): Promise<void> {
  const image = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/pixel-planet.png'),
  );
  const texture = createTexture(renderContext, image, { filter: 'nearest' });
  const entity = world.createEntity();

  addSpriteComponent(
    world,
    entity,
    createImageSprite(texture, { pixelsPerUnit: 1 }),
  );
  addPositionComponent(world, entity);
  addRotationComponent(world, entity);
  addScaleComponent(world, entity, { local: { x: 4.5, y: 4.5 } });
  world.addComponent(entity, spinId, { radiansPerSecond: 0.5 });
}
