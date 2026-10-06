import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { degreesToRadians, Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  Color,
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  addParticleEmitterComponent,
  ParticleEmitter,
} from '@forge-game-engine/forge/particles';

const emberColor = new Color(1, 0.55, 0.15);
const coneSpread = degreesToRadians(20);

/**
 * Creates a fountain of embers that streams upward from a fixed point,
 * slowing as it rises, then shrinking and fading away, forever. A steady
 * `emissionRate` keeps it running with no input and no system of its own,
 * unlike the cursor's click/drag-driven effects.
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

  const emberSprite = createImageSprite(emberImage, renderContext, {
    pixelsPerUnit: 1,
    layer: renderLayer,
  });

  emberSprite.tintColor = emberColor;

  const emberEmitter = new ParticleEmitter(emberSprite, {
    emissionRate: 40,
    spawnShape: { type: 'box', width: 30, height: 0 },
    speedRange: { min: 160, max: 260 },
    // Math.PI / 2 points straight up, so this sprays a narrow upward cone.
    directionRange: {
      min: Math.PI / 2 - coneSpread,
      max: Math.PI / 2 + coneSpread,
    },
    drag: 0.5,
    scaleRange: { min: 0.04, max: 0.1 },
    lifetimeSecondsRange: { min: 1.2, max: 2 },
    lifetimeScaleReduction: 0,
    lifetimeOpacity: { start: 1, end: 0 },
  });

  // The emitter spawns particles around its entity's world position.
  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: Vec2.clone(position) });

  addParticleEmitterComponent(world, entity, {
    emitters: new Map([['embers', emberEmitter]]),
  });
}
