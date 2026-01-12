import {
  Color,
  createSprite,
  createTextureFromImage,
  Material,
  RenderContext,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { positionId } from '@forge-game-engine/forge/common';
import { backgroundShader } from './_background.shader';
import { backgroundId } from './_background.component';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { Vector2 } from '../../../../../dist';

export async function createBackground(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  renderContext.shaderCache.addShader(backgroundShader);

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

  const backgroundSprite = createSprite(
    backgroundMaterial,
    renderContext,
    renderLayer,
    renderContext.canvas.width,
    renderContext.canvas.height,
  );

  const backgroundEntity = world.createEntity();

  world.addComponent(backgroundEntity, spriteId, {
    sprite: backgroundSprite,
    enabled: true,
  });

  world.addComponent(backgroundEntity, positionId, {
    local: Vector2.zero,
    world: Vector2.zero,
  });

  world.addTag(backgroundEntity, backgroundId);
}
