import {
  addSpriteComponent,
  Color,
  combineInstanceDataSegments,
  createQuadGeometry,
  createTextureFromImage,
  ForgeShaderSource,
  Material,
  Renderable,
  RenderContext,
  spriteInstanceDataSegment,
} from '@forge-game-engine/forge/rendering';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { addPositionComponent } from '@forge-game-engine/forge/common';
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

  const backgroundEntity = world.createEntity();

  addSpriteComponent(world, backgroundEntity, {
    width: renderContext.canvas.width,
    height: renderContext.canvas.height,
    renderable,
  });

  addPositionComponent(world, backgroundEntity);

  world.addTag(backgroundEntity, backgroundId);
}
