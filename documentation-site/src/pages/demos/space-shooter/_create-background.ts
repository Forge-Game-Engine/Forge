import {
  Color,
  createImageSprite,
  createSprite,
  Material,
  RenderContext,
  RenderLayer,
  SpriteComponent,
} from '@forge-game-engine/forge/rendering';
import { Entity, World } from '@forge-game-engine/forge/ecs';
import { PositionComponent } from '@forge-game-engine/forge/common';
import {
  ParticleEmitter,
  ParticleEmitterComponent,
} from '@forge-game-engine/forge/particles';
import { backgroundShader } from './_background.shader';
import { BackgroundComponent } from './_background.component';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

export async function createBackground(
  world: World,
  cameraEntity: Entity,
  renderLayer: RenderLayer,
  renderContext: RenderContext,
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

  const backgroundSprite = createSprite(
    backgroundMaterial,
    renderContext,
    cameraEntity,
    renderContext.canvas.width,
    renderContext.canvas.height,
  );

  const backgroundEntity = world.buildAndAddEntity([
    new SpriteComponent(backgroundSprite),
    new PositionComponent(0, 0),
    new BackgroundComponent(),
  ]);

  const smallStarSprite = await createImageSprite(
    getAssetUrl('img/space-shooter/star_small.png'),
    renderContext,
    cameraEntity,
  );

  const emitter = new ParticleEmitter(smallStarSprite, renderLayer, {
    emitDurationSeconds: 10,
    lifetimeSecondsRange: { min: 5, max: 10 },
  });

  const emitterComponent = new ParticleEmitterComponent(
    new Map([['emitter', emitter]]),
  );

  world.buildAndAddEntity([emitterComponent]);

  renderLayer.addEntity(backgroundSprite.renderable, backgroundEntity);
}
