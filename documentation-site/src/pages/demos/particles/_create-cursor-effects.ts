import { getAssetUrl } from '@site/src/utils/get-asset-url';
import {
  addPositionComponent,
  PositionEcsComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { degreesToRadians, Vector2 } from '@forge-game-engine/forge/math';
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
const smokeConeSpread = degreesToRadians(45);
const smokeParticlesPerSecond = 30;

/**
 * Controls the cursor's two particle effects, a spark burst and a smoke
 * trail, both driven by mouse input rather than running on their own.
 */
export interface CursorEffects {
  /**
   * Moves the cursor entity, which the spark and smoke emitters spawn
   * around.
   * @param position - The new world position.
   */
  setCursorPosition: (position: Vector2) => void;
  /**
   * Fires a one-off ring of sparks from the current cursor position.
   */
  triggerSparkBurst: () => void;
  /**
   * Starts or stops the steady stream of smoke from the cursor.
   * @param isSmoking - Whether the cursor should be trailing smoke.
   */
  setSmokeTrail: (isSmoking: boolean) => void;
}

/**
 * Creates a single entity with two named particle emitters, "spark" and
 * "smoke", that both spawn around the entity's position. This mirrors the
 * common pattern of driving several independent effects, like an attack
 * swoosh and a footstep puff, from one entity.
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
  const [sparkImage, smokeImage] = await Promise.all([
    renderContext.imageCache.getOrLoad(
      getAssetUrl('img/kenney_particle-pack/PNG (Transparent)/star_07.png'),
    ),
    renderContext.imageCache.getOrLoad(
      getAssetUrl('img/kenney_particle-pack/PNG (Transparent)/smoke_05.png'),
    ),
  ]);

  const sparkSprite = createImageSprite(sparkImage, renderContext, {
    pixelsPerUnit: 1,
    layer: renderLayer,
  });

  sparkSprite.tintColor = sparkColor;

  const smokeSprite = createImageSprite(smokeImage, renderContext, {
    pixelsPerUnit: 1,
    layer: renderLayer,
  });

  smokeSprite.tintColor = smokeColor;

  // Sparks fly outward from a small ring around the cursor, slow down
  // quickly with drag, and fall under gravity as they fade out.
  const sparkEmitter = new ParticleEmitter(sparkSprite, {
    numParticlesRange: { min: 24, max: 36 },
    spawnShape: { type: 'ring', radius: 10 },
    emitOutward: true,
    speedRange: { min: 300, max: 600 },
    drag: 0.05,
    acceleration: { x: 0, y: -400 },
    scaleRange: { min: 0.1, max: 0.26 },
    rotationRange: { min: 0, max: Math.PI * 2 },
    rotationSpeedRange: { min: -4, max: 4 },
    lifetimeSecondsRange: { min: 0.4, max: 0.8 },
    lifetimeScaleReduction: 0.3,
    lifetimeOpacity: { start: 1, end: 0 },
  });

  // Smoke drifts upward, spreads out and grows as it fades.
  const smokeEmitter = new ParticleEmitter(smokeSprite, {
    spawnShape: { type: 'circle', radius: 8 },
    speedRange: { min: 15, max: 35 },
    directionRange: {
      min: Math.PI / 2 - smokeConeSpread,
      max: Math.PI / 2 + smokeConeSpread,
    },
    acceleration: { x: 0, y: 40 },
    scaleRange: { min: 0.12, max: 0.22 },
    rotationRange: { min: 0, max: Math.PI * 2 },
    rotationSpeedRange: { min: -0.4, max: 0.4 },
    lifetimeSecondsRange: { min: 0.6, max: 1 },
    lifetimeScaleReduction: 2,
    lifetimeOpacity: { start: 0.8, end: 0 },
  });

  const entity = world.createEntity();

  const position: PositionEcsComponent = addPositionComponent(world, entity);

  addParticleEmitterComponent(world, entity, {
    emitters: new Map([
      ['spark', sparkEmitter],
      ['smoke', smokeEmitter],
    ]),
  });

  return {
    setCursorPosition: ({ x, y }) => {
      // The transform system turns this into the world position the
      // emitters read.
      position.local.x = x;
      position.local.y = y;
    },
    triggerSparkBurst: () => sparkEmitter.emit(),
    setSmokeTrail: (isSmoking) =>
      smokeEmitter.setOptions({
        emissionRate: isSmoking ? smokeParticlesPerSecond : 0,
      }),
  };
}
