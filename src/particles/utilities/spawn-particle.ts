import { ageScaleId } from '../../common/components/age-scale-component.js';
import { addPositionComponent } from '../../common/components/position-component.js';
import { addRotationComponent } from '../../common/components/rotation-component.js';
import { addScaleComponent } from '../../common/components/scale-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { lifetimeId } from '../../lifecycle/components/lifetime-component.js';
import { RemoveFromWorldLifetimeStrategyId } from '../../lifecycle/strategies/remove-from-world-strategy-component.js';
import { degreesToRadians } from '../../math/degrees-to-radians.js';
import { Random } from '../../math/random.js';
import { Vec2, Vector2 } from '../../math/vector2.js';
import { addSpriteComponent } from '../../rendering/components/sprite-component.js';
import { ParticleId } from '../components/particle-component.js';
import { ParticleEmitter, Range } from '../components/particle-emitter.js';
import { sampleSpawnShape } from './sample-spawn-shape.js';

function randomInRange(range: Range, random: Random): number {
  return random.randomFloat(range.min, range.max);
}

/**
 * Picks an angle, in degrees, from `range`. A range spanning a whole number
 * of full turns (such as the default `0` to `360`) picks from the full
 * circle.
 */
function randomAngleInRangeDegrees(range: Range, random: Random): number {
  const { min, max } = range;
  const span = (max - min) % 360;

  if (span === 0 && max !== min) {
    return random.randomFloat(0, 360);
  }

  return random.randomFloat(min, min + span);
}

/**
 * Picks the direction a particle starts moving in, in radians, measured
 * clockwise from straight up.
 */
function pickDirection(
  particleEmitter: ParticleEmitter,
  spawnOffset: Vector2,
  random: Random,
): number {
  const isAtCenter = spawnOffset.x === 0 && spawnOffset.y === 0;

  if (particleEmitter.emitOutward && !isAtCenter) {
    return Math.atan2(spawnOffset.x, spawnOffset.y);
  }

  return degreesToRadians(
    randomAngleInRangeDegrees(particleEmitter.directionRange, random),
  );
}

/**
 * Picks how many particles one emission from `particleEmitter` spawns.
 * @param particleEmitter - The emitter to pick a count for.
 * @param random - The random instance used to pick from `numParticlesRange`.
 * @returns A whole number of particles.
 */
export function pickParticleCount(
  particleEmitter: ParticleEmitter,
  random: Random,
): number {
  return Math.round(randomInRange(particleEmitter.numParticlesRange, random));
}

/**
 * Spawns one particle from `particleEmitter`, somewhere in its spawn shape
 * centered on `origin`.
 * @param world - The ECS world to create the particle in.
 * @param particleEmitter - The emitter describing the particle.
 * @param origin - The world position the emitter's spawn shape is centered
 * on.
 * @param random - The random instance used to pick values from the emitter's
 * ranges.
 * @returns The particle entity.
 */
export function spawnParticle(
  world: EcsWorld,
  particleEmitter: ParticleEmitter,
  origin: Vector2,
  random: Random,
): number {
  const spawnOffset = sampleSpawnShape(particleEmitter.spawnShape, random);
  const direction = pickDirection(particleEmitter, spawnOffset, random);
  const speed = randomInRange(particleEmitter.speedRange, random);
  const scale = randomInRange(particleEmitter.scaleRange, random);
  const rotation = degreesToRadians(
    randomAngleInRangeDegrees(particleEmitter.rotationRange, random),
  );

  const spawnPosition = Vec2.add(spawnOffset, origin);
  const { lifetimeOpacity } = particleEmitter;

  const particle = world.createEntity();

  // Each particle gets its own sprite, so a system can fade or tint one
  // particle without changing every other particle from the same emitter.
  // `addSpriteComponent` also fills in what a plain `Sprite` lacks
  // (`enabled`, `layer`, `uvOffset`, `uvScale`).
  const sprite = addSpriteComponent(world, particle, {
    ...particleEmitter.sprite,
  });

  sprite.pivot = Vec2.clone(sprite.pivot);
  sprite.uvOffset = Vec2.clone(sprite.uvOffset);
  sprite.uvScale = Vec2.clone(sprite.uvScale);
  sprite.opacityMultiplier = lifetimeOpacity.start;

  world.addComponent(particle, ParticleId, {
    velocity: {
      x: Math.sin(direction) * speed,
      y: Math.cos(direction) * speed,
    },
    acceleration: Vec2.clone(particleEmitter.acceleration),
    drag: particleEmitter.drag,
    rotationSpeed: randomInRange(particleEmitter.rotationSpeedRange, random),
    startOpacity: lifetimeOpacity.start,
    endOpacity: lifetimeOpacity.end,
    getVelocityOffset: particleEmitter.getVelocityOffset,
  });

  world.addComponent(particle, lifetimeId, {
    durationSeconds: randomInRange(
      particleEmitter.lifetimeSecondsRange,
      random,
    ),
    elapsedSeconds: 0,
    hasExpired: false,
  });

  world.addTag(particle, RemoveFromWorldLifetimeStrategyId);

  world.addComponent(particle, ageScaleId, {
    originalScaleX: scale,
    originalScaleY: scale,
    finalLifetimeScaleX: scale * particleEmitter.lifetimeScaleReduction,
    finalLifetimeScaleY: scale * particleEmitter.lifetimeScaleReduction,
  });

  addPositionComponent(world, particle, { local: spawnPosition });
  addScaleComponent(world, particle, { local: { x: scale, y: scale } });
  addRotationComponent(world, particle, { local: rotation });

  particleEmitter.onParticleSpawned?.(world, particle);

  return particle;
}
