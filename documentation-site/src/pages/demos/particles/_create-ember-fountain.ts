import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  Color,
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  ParticleEmitter,
  ParticleEmitterId,
} from '@forge-game-engine/forge/particles';
import { ambientEmitterId } from './_ambient-emitter.component';

const emberColor = new Color(1, 0.55, 0.15);
const coneSpreadDegrees = 20;

/**
 * Creates a fountain of embers that drifts upward from a fixed point and
 * shrinks away, forever. The entity is tagged `ambientEmitterId` so
 * `createAmbientEmitterEcsSystem` keeps re-triggering its emitter without
 * any player input, unlike the cursor's click/drag-driven effects.
 * @param world - The ECS world to add the fountain entity to.
 * @param renderContext - The render context used to load the ember sprite.
 * @param renderLayer - The render layer the embers should be drawn on.
 * @param position - The fixed world position embers spawn from.
 */
export async function createEmberFountain(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  position: Vector2,
): Promise<void> {
  const emberImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/kenney_particle-pack/PNG (Transparent)/circle_01.png'),
  );

  const emberSprite = createImageSprite(emberImage, renderContext, renderLayer);

  emberSprite.tintColor = emberColor;

  const emberEmitter = new ParticleEmitter(emberSprite, renderLayer, {
    numParticlesRange: { min: 1, max: 2 },
    speedRange: { min: 40, max: 90 },
    scaleRange: { min: 0.04, max: 0.1 },
    rotationRange: {
      min: -coneSpreadDegrees,
      max: coneSpreadDegrees,
    },
    rotationSpeedRange: { min: -0.3, max: 0.3 },
    lifetimeSecondsRange: { min: 1.2, max: 2 },
    lifetimeScaleReduction: 0,
    emitDurationSeconds: 0,
    spawnPosition: () => position,
  });

  const entity = world.createEntity();

  world.addComponent(entity, ParticleEmitterId, {
    emitters: new Map([['embers', emberEmitter]]),
  });

  world.addTag(entity, ambientEmitterId);
}
