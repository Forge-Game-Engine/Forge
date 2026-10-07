import {
  addSpriteComponent,
  Color,
  createSpriteMaterial,
  ForgeShaderSource,
  getCameraView,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { backgroundShader } from './_background.shader';
import { backgroundId } from './_background.component';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

export async function createBackground(
  world: EcsWorld,
  camera: number,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  renderContext.shaderCache.addShader(new ForgeShaderSource(backgroundShader));

  const backgroundMaterial = createSpriteMaterial(
    renderContext,
    'background.frag',
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
    await renderContext.textureCache.getOrLoad(
      getAssetUrl('img/space-shooter/nebula.png'),
    ),
  );

  const backgroundEntity = world.createEntity();

  const visibleWorldSize = getCameraView(world, camera, renderContext).size;

  addSpriteComponent(world, backgroundEntity, {
    width: visibleWorldSize.x,
    height: visibleWorldSize.y,
    texture: renderContext.whiteTexture,
    material: backgroundMaterial,
    category: renderLayer,
  });

  addPositionComponent(world, backgroundEntity);

  world.addTag(backgroundEntity, backgroundId);
}
