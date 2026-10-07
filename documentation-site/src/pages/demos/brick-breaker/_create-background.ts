import {
  addSpriteComponent,
  createSpriteMaterial,
  ForgeShaderSource,
  getCameraView,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { backgroundShader } from './_background.shader';
import { backgroundId } from './_background.component';

/**
 * Creates a full-screen, shader-driven gradient sprite that sits behind the
 * play area, so the backdrop doesn't need a static image asset.
 * @param world - The ECS world to add the background entity to.
 * @param camera - The camera entity whose visible area the background fills.
 * @param renderContext - The render context used to build the material.
 * @param renderLayer - The render layer the background should be drawn on.
 */
export function createBackground(
  world: EcsWorld,
  camera: number,
  renderContext: RenderContext,
  renderLayer: number,
): void {
  renderContext.shaderCache.addShader(new ForgeShaderSource(backgroundShader));

  const material = createSpriteMaterial(renderContext, 'background.frag');

  material.setUniform('u_time', 0);

  const backgroundEntity = world.createEntity();

  const visibleWorldSize = getCameraView(world, camera, renderContext).size;

  addSpriteComponent(world, backgroundEntity, {
    width: visibleWorldSize.x,
    height: visibleWorldSize.y,
    texture: renderContext.whiteTexture,
    material,
    category: renderLayer,
    layer: renderLayer,
  });

  addPositionComponent(world, backgroundEntity);

  world.addTag(backgroundEntity, backgroundId);
}
