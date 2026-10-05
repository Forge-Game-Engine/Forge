import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addSpriteComponent,
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

/**
 * Places a planet with the Forge logo over it: an ordinary scene, drawn
 * by the camera before its post-processing passes run over the image.
 */
export async function createScene(
  world: EcsWorld,
  renderContext: RenderContext,
  layer: number,
): Promise<void> {
  const { imageCache } = renderContext;
  const [planetImage, logoImage] = await Promise.all([
    imageCache.getOrLoad(getAssetUrl('img/pixel-planet.png')),
    imageCache.getOrLoad(getAssetUrl('img/forge-logo.png')),
  ]);

  const planet = world.createEntity();

  addPositionComponent(world, planet);
  addSpriteComponent(world, planet, {
    ...createImageSprite(planetImage, renderContext, {
      layer,
      pixelated: true,
    }),
    width: 420,
    height: 420,
  });

  const logo = world.createEntity();

  addPositionComponent(world, logo);
  addSpriteComponent(world, logo, {
    ...createImageSprite(logoImage, renderContext, { layer }),
    width: 220,
    height: 220,
    sortDepth: 1,
  });
}
