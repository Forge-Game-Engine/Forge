import {
  Color,
  combineInstanceDataSegments,
  createQuadGeometry,
  ForgeShaderSource,
  Material,
  Renderable,
  RenderContext,
  SpriteEcsComponent,
  spriteId,
  spriteInstanceDataSegment,
} from '@forge-game-engine/forge/rendering';
import { Vector2 } from '@forge-game-engine/forge/math';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { positionId } from '@forge-game-engine/forge/common';
import { backgroundShader } from './_background.shader';
import { backgroundId } from './_background.component';

/**
 * Creates a full-screen, shader-driven gradient sprite that sits behind the
 * play area, so the backdrop doesn't need a static image asset.
 * @param world - The ECS world to add the background entity to.
 * @param renderContext - The render context used to build the material.
 * @param renderLayer - The render layer the background should be drawn on.
 */
export function createBackground(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): void {
  renderContext.shaderCache.addShader(new ForgeShaderSource(backgroundShader));

  const vertexShader = renderContext.shaderCache.getShader('sprite.vert');
  const fragmentShader = renderContext.shaderCache.getShader('background.frag');

  const material = new Material(
    vertexShader,
    fragmentShader,
    renderContext.gl,
    renderContext.programCache,
  );

  material.setUniform('u_time', 0);

  const { floatsPerInstance, bindInstanceData, setupInstanceAttributes } =
    combineInstanceDataSegments(spriteInstanceDataSegment);

  const renderable = new Renderable(
    createQuadGeometry(renderContext.gl),
    material,
    floatsPerInstance,
    renderLayer,
    bindInstanceData,
    setupInstanceAttributes,
  );

  const backgroundSprite: SpriteEcsComponent = {
    enabled: true,
    width: renderContext.canvas.width,
    height: renderContext.canvas.height,
    pivot: new Vector2(0.5, 0.5),
    tintColor: Color.white,
    renderable,
    uvOffset: new Vector2(0, 0),
    uvScale: new Vector2(1, 1),
    layer: renderLayer,
  };

  const backgroundEntity = world.createEntity();

  world.addComponent(backgroundEntity, spriteId, backgroundSprite);

  world.addComponent(backgroundEntity, positionId, {
    local: Vector2.zero,
    world: Vector2.zero,
  });

  world.addTag(backgroundEntity, backgroundId);
}
