import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  Color,
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  addParticleEmitterComponent,
  ParticleEmitter,
} from '@forge-game-engine/forge/particles';

const sparkColor = new Color(1, 0.85, 0.3);
const smokeColor = new Color(0.55, 0.55, 0.6);
const smokeConeSpreadDegrees = 45;

/**
 * Controls the cursor's two particle effects, a spark burst and a smoke
 * trail, both driven by mouse input rather than running on their own.
 */
export interface CursorEffects {
  /**
   * Updates the world position the spark and smoke emitters spawn from.
   * @param position - The new world position.
   */
  setCursorPosition: (position: Vector2) => void;
  /**
   * Fires a one-off burst of sparks from the current cursor position.
   */
  triggerSparkBurst: () => void;
  /**
   * Keeps the smoke trail emitting from the current cursor position,
   * intended to be called every frame while the mouse is held and dragged.
   */
  continueSmokeTrail: () => void;
}

/**
 * Creates a single entity with two named particle emitters, "spark" and
 * "smoke", that both spawn from a shared, mutable cursor position. This
 * mirrors the common pattern of driving several independent effects, like an
 * attack swoosh and a footstep puff, from one entity.
 * @param world - The ECS world to add the cursor entity to.
 * @param renderContext - The render context used to load the particle sprites.
 * @param renderLayer - The render layer the particles should be drawn on.
 * @returns Functions for driving the spark and smoke emitters from input.
 */
export async function createCursorEffects(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<CursorEffects> {
  let cursorPosition = Vector2.zero;

  const [sparkImage, smokeImage] = await Promise.all([
    renderContext.imageCache.getOrLoad(
      getAssetUrl('img/kenney_particle-pack/PNG (Transparent)/star_07.png'),
    ),
    renderContext.imageCache.getOrLoad(
      getAssetUrl('img/kenney_particle-pack/PNG (Transparent)/smoke_05.png'),
    ),
  ]);

  const sparkSprite = createImageSprite(sparkImage, renderContext, renderLayer);

  sparkSprite.tintColor = sparkColor;

  const smokeSprite = createImageSprite(smokeImage, renderContext, renderLayer);

  smokeSprite.tintColor = smokeColor;

  const sparkEmitter = new ParticleEmitter(sparkSprite, renderLayer, {
    numParticlesRange: { min: 24, max: 36 },
    speedRange: { min: 140, max: 320 },
    scaleRange: { min: 0.1, max: 0.26 },
    rotationRange: { min: 0, max: 360 },
    rotationSpeedRange: { min: -4, max: 4 },
    lifetimeSecondsRange: { min: 0.3, max: 0.6 },
    lifetimeScaleReduction: 0,
    emitDurationSeconds: 0,
    spawnPosition: () => cursorPosition,
  });

  const smokeEmitter = new ParticleEmitter(smokeSprite, renderLayer, {
    numParticlesRange: { min: 1, max: 2 },
    speedRange: { min: 15, max: 35 },
    scaleRange: { min: 0.12, max: 0.22 },
    rotationRange: {
      min: -smokeConeSpreadDegrees,
      max: smokeConeSpreadDegrees,
    },
    rotationSpeedRange: { min: -0.4, max: 0.4 },
    lifetimeSecondsRange: { min: 0.6, max: 1 },
    lifetimeScaleReduction: 1.4,
    emitDurationSeconds: 0,
    spawnPosition: () => cursorPosition,
  });

  const entity = world.createEntity();

  addParticleEmitterComponent(world, entity, {
    emitters: new Map([
      ['spark', sparkEmitter],
      ['smoke', smokeEmitter],
    ]),
  });

  return {
    setCursorPosition: (position) => {
      cursorPosition = position;
    },
    triggerSparkBurst: () => sparkEmitter.emitIfNotEmitting(),
    continueSmokeTrail: () => smokeEmitter.emitIfNotEmitting(),
  };
}
