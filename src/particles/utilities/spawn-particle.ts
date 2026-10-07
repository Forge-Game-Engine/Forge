import { ageScaleId } from '../../common/components/age-scale-component.js';
import { addPositionComponent } from '../../common/components/position-component.js';
import { addRotationComponent } from '../../common/components/rotation-component.js';
import { addScaleComponent } from '../../common/components/scale-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { lifetimeId } from '../../lifecycle/components/lifetime-component.js';
import { RemoveFromWorldLifetimeStrategyId } from '../../lifecycle/strategies/remove-from-world-strategy-component.js';
import { radiansToVector } from '../../math/radians-to-vector.js';
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
 * Picks the direction a particle starts moving in, in radians, in the
 * emitter's frame: counter-clockwise from the frame's `+X`.
 */
function pickLocalDirection(
  particleEmitter: ParticleEmitter,
  localSpawnOffset: Vector2,
  random: Random,
): number {
  const isAtCenter = localSpawnOffset.x === 0 && localSpawnOffset.y === 0;

  if (particleEmitter.emitOutward && !isAtCenter) {
    return Math.atan2(localSpawnOffset.y, localSpawnOffset.x);
  }

  return randomInRange(particleEmitter.directionRange, random);
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
 * centered on `origin`. The spawn shape and the direction picked from
 * `directionRange` are in the emitter's frame, which is turned `rotation`
 * radians from the world's.
 * @param world - The ECS world to create the particle in.
 * @param particleEmitter - The emitter describing the particle.
 * @param origin - The world position the emitter's spawn shape is centered
 * on.
 * @param rotation - The emitter frame's world rotation, in radians,
 * counter-clockwise.
 * @param random - The random instance used to pick values from the emitter's
 * ranges.
 * @returns The particle entity.
 */
export function spawnParticle(
  world: EcsWorld,
  particleEmitter: ParticleEmitter,
  origin: Vector2,
  rotation: number,
  random: Random,
): number {
  const localSpawnOffset = sampleSpawnShape(particleEmitter.spawnShape, random);
  const direction =
    pickLocalDirection(particleEmitter, localSpawnOffset, random) + rotation;
  const speed = randomInRange(particleEmitter.speedRange, random);
  const scale = randomInRange(particleEmitter.scaleRange, random);
  const spriteRotation = randomInRange(particleEmitter.rotationRange, random);

  // `localSpawnOffset` is a fresh vector, so it's turned into the world's
  // frame in place.
  const spawnPosition = Vec2.add(
    Vec2.rotate(localSpawnOffset, rotation),
    origin,
  );
  const { lifetimeOpacity } = particleEmitter;

  const particle = world.createEntity();

  // Each particle gets its own sprite, so a system can fade or tint one
  // particle without changing every other particle from the same emitter.
  // `addSpriteComponent` also fills in what a plain `Sprite` lacks
  // (`enabled`, `layer`, `uvOffset`, `uvScale`).
  const sprite = addSpriteComponent(world, particle, particleEmitter.sprite);

  sprite.opacityMultiplier = lifetimeOpacity.start;

  world.addComponent(particle, ParticleId, {
    velocity: Vec2.multiply(radiansToVector(direction), speed),
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
  addRotationComponent(world, particle, { local: spriteRotation });

  particleEmitter.onParticleSpawned?.(world, particle);

  return particle;
}
