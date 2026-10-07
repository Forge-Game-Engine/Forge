import { EcsWorld } from '../../ecs/ecs-world.js';
import { Random } from '../../math/random.js';
import { Vector2 } from '../../math/vector2.js';
import { ParticleEmitter } from '../components/particle-emitter.js';
import { pickParticleCount, spawnParticle } from './spawn-particle.js';
import { withDefaults } from '../../utilities/with-defaults.js';

/**
 * Options for {@link emitParticleBurst}.
 */
export interface EmitParticleBurstOptions {
  /**
   * How many particles to spawn. Defaults to a random count from the
   * emitter's `numParticlesRange`.
   */
  count?: number;

  /**
   * The world rotation, in radians, counter-clockwise, of the frame the
   * burst emits in: the emitter's spawn shape and `directionRange` turn by
   * it, the same as they turn with the entity an emitter is on.
   * @default 0
   */
  rotation?: number;
}

const defaultEmitParticleBurstOptions = {
  rotation: 0,
};

/**
 * Spawns a burst of particles from `particleEmitter` straight away, with its
 * spawn shape centered on `position`. The emitter doesn't need to be on an
 * entity, so this works for effects where something was just removed, such
 * as a pickup being collected. Particles spawned this way don't count
 * towards the emitter's own `emit()` progress.
 * @param world - The ECS world to create the particles in.
 * @param particleEmitter - The emitter describing the particles.
 * @param position - The world position to center the burst on.
 * @param random - The random instance used to pick values from the emitter's
 * ranges.
 * @param options - Options for the burst.
 * @returns The spawned particle entities.
 */
export function emitParticleBurst(
  world: EcsWorld,
  particleEmitter: ParticleEmitter,
  position: Vector2,
  random: Random,
  options: EmitParticleBurstOptions = {},
): number[] {
  const { count, rotation } = withDefaults(
    defaultEmitParticleBurstOptions,
    options,
  );
  const particleCount = count ?? pickParticleCount(particleEmitter, random);

  const particles: number[] = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push(
      spawnParticle(world, particleEmitter, position, rotation, random),
    );
  }

  return particles;
}
