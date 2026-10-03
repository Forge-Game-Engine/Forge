import { positionId } from '../../common/components/position-component.js';
import { Time } from '../../common/time/Time.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Random } from '../../math/random.js';
import { Vector2 } from '../../math/vector2.js';
import { ParticleEmitter } from '../components/particle-emitter.js';
import {
  ParticleEmitterEcsComponent,
  ParticleEmitterId,
} from '../components/particle-emitter-component.js';
import {
  pickParticleCount,
  spawnParticle,
} from '../utilities/spawn-particle.js';

const worldOrigin: Readonly<Vector2> = { x: 0, y: 0 };

function startEmittingParticles(
  particleEmitter: ParticleEmitter,
  random: Random,
): void {
  if (particleEmitter.startEmitting) {
    particleEmitter.currentEmitDuration = 0;
    particleEmitter.startEmitting = false;
    particleEmitter.emitCount = 0;
    particleEmitter.currentlyEmitting = true;
    particleEmitter.totalAmountToEmit = pickParticleCount(
      particleEmitter,
      random,
    );
  }
}

function getAmountToEmitBasedOnDuration(
  particleEmitter: ParticleEmitter,
): number {
  if (particleEmitter.emitDurationSeconds <= 0) {
    return particleEmitter.totalAmountToEmit - particleEmitter.emitCount;
  }

  const emitProgress = Math.min(
    particleEmitter.currentEmitDuration / particleEmitter.emitDurationSeconds,
    1,
  );
  const targetEmitCount = Math.ceil(
    emitProgress * particleEmitter.totalAmountToEmit,
  );

  return targetEmitCount - particleEmitter.emitCount;
}

function emitNewParticles(
  particleEmitter: ParticleEmitter,
  origin: Vector2,
  random: Random,
  world: EcsWorld,
): void {
  if (
    !particleEmitter.currentlyEmitting ||
    particleEmitter.emitCount >= particleEmitter.totalAmountToEmit
  ) {
    particleEmitter.currentlyEmitting = false;

    return;
  }

  const currentAmountToEmit = getAmountToEmitBasedOnDuration(particleEmitter);

  for (let i = 0; i < currentAmountToEmit; i++) {
    spawnParticle(world, particleEmitter, origin, random);
  }

  particleEmitter.emitCount += currentAmountToEmit;
}

function emitParticleStream(
  particleEmitter: ParticleEmitter,
  origin: Vector2,
  deltaTimeInSeconds: number,
  random: Random,
  world: EcsWorld,
): void {
  if (particleEmitter.emissionRate <= 0) {
    particleEmitter.emissionRemainder = 0;

    return;
  }

  const due =
    particleEmitter.emissionRemainder +
    particleEmitter.emissionRate * deltaTimeInSeconds;
  const amountToEmit = Math.floor(due);

  particleEmitter.emissionRemainder = due - amountToEmit;

  for (let i = 0; i < amountToEmit; i++) {
    spawnParticle(world, particleEmitter, origin, random);
  }
}

/**
 * Creates an ECS system that spawns particles from every
 * `ParticleEmitterEcsComponent`'s emitters: the batches started by
 * `emit()`/`emitIfNotEmitting()`, and the steady stream set by
 * `emissionRate`. Particles spawn around the world position
 * (`PositionEcsComponent.world`) of the entity the emitter is on, or the
 * world origin if it has no position.
 * @param time - The time instance used to advance emitter timers.
 * @param random - The random instance used to pick values from emitter ranges.
 * @returns The particle emitter ECS system.
 */
export const createParticleEcsSystem = (
  time: Time,
  random: Random,
): EcsSystem<[ParticleEmitterEcsComponent]> => ({
  query: [ParticleEmitterId],
  update: (world, { entities, components: [particleEmitterComponents] }) => {
    const { deltaTimeInSeconds } = time;

    for (let i = 0; i < entities.length; i++) {
      const origin =
        world.getComponent(entities[i], positionId)?.world ?? worldOrigin;

      for (const particleEmitter of particleEmitterComponents[
        i
      ].emitters.values()) {
        particleEmitter.currentEmitDuration += deltaTimeInSeconds;

        startEmittingParticles(particleEmitter, random);

        emitNewParticles(particleEmitter, origin, random, world);

        emitParticleStream(
          particleEmitter,
          origin,
          deltaTimeInSeconds,
          random,
          world,
        );
      }
    }
  },
});
