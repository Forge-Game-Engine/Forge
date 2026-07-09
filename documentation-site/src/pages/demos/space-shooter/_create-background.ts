import {
  Color,
  combineInstanceDataSegments,
  createQuadGeometry,
  createTextureFromImage,
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
import { getAssetUrl } from '@site/src/utils/get-asset-url';

export async function createBackground(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  renderContext.shaderCache.addShader(new ForgeShaderSource(backgroundShader));

  const vertexShader = renderContext.shaderCache.getShader('sprite.vert');
  const fragmentShader = renderContext.shaderCache.getShader('background.frag');

  const backgroundMaterial = new Material(
    vertexShader,
    fragmentShader,
    renderContext.gl,
    renderContext.programCache,
  );

  backgroundMaterial.setUniform(
    'u_resolution',
    new Float32Array([renderContext.canvas.width, renderContext.canvas.height]),
  );

  backgroundMaterial.setUniform(
    'u_color',
    new Color(0.2, 0.2, 1, 0.9).toFloat32Array(),
  );

  backgroundMaterial.setUniform(
    'u_bgTexture',
    createTextureFromImage(
      renderContext.gl,
      await renderContext.imageCache.getOrLoad(
        getAssetUrl('img/space-shooter/nebula.png'),
      ),
    ),
  );

  const { floatsPerInstance, bindInstanceData, setupInstanceAttributes } =
    combineInstanceDataSegments(spriteInstanceDataSegment);

  const renderable = new Renderable(
    createQuadGeometry(renderContext.gl),
    backgroundMaterial,
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
    layer: 0,
  };

  const backgroundEntity = world.createEntity();

  world.addComponent(backgroundEntity, spriteId, backgroundSprite);

  world.addComponent(backgroundEntity, positionId, {
    local: Vector2.zero,
    world: Vector2.zero,
  });

  world.addTag(backgroundEntity, backgroundId);
}
