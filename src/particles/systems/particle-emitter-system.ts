import { positionId } from '../../common/components/position-component.js';
import { rotationId } from '../../common/components/rotation-component.js';
import { Time } from '../../common/time/Time.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Random } from '../../math/random.js';
import { Vector2 } from '../../math/vector2.js';
import { isVisibleInHierarchy } from '../../rendering/components/visibility-component.js';
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
  rotation: number,
  random: Random,
  world: EcsWorld,
  visible: boolean,
): void {
  if (
    !particleEmitter.currentlyEmitting ||
    particleEmitter.emitCount >= particleEmitter.totalAmountToEmit
  ) {
    particleEmitter.currentlyEmitting = false;

    return;
  }

  const currentAmountToEmit = getAmountToEmitBasedOnDuration(particleEmitter);

  // A hidden emitter's batch still runs its course, so showing the emitter
  // again doesn't release the particles it skipped all at once.
  for (let i = 0; visible && i < currentAmountToEmit; i++) {
    spawnParticle(world, particleEmitter, origin, rotation, random);
  }

  particleEmitter.emitCount += currentAmountToEmit;
}

function emitParticleStream(
  particleEmitter: ParticleEmitter,
  origin: Vector2,
  rotation: number,
  deltaTimeInSeconds: number,
  random: Random,
  world: EcsWorld,
  visible: boolean,
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

  for (let i = 0; visible && i < amountToEmit; i++) {
    spawnParticle(world, particleEmitter, origin, rotation, random);
  }
}

/**
 * Creates an ECS system that spawns particles from every
 * `ParticleEmitterEcsComponent`'s emitters: the batches started by
 * `emit()`/`emitIfNotEmitting()`, and the steady stream set by
 * `emissionRate`. Particles spawn around the world position
 * (`PositionEcsComponent.world`) of the entity the emitter is on, or the
 * world origin if it has no position. Each emitter's spawn shape and
 * `directionRange` turn with the entity's world rotation
 * (`RotationEcsComponent.world`), or don't turn if it has no rotation.
 *
 * An emitter on an entity hidden in the hierarchy (see
 * `VisibilityEcsComponent`) spawns nothing, but its batches and stream
 * keep their timing, so showing it again picks up where a visible emitter
 * would be rather than spawning the particles it skipped. Particles
 * already spawned are their own entities and live out their lifetimes.
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
      const rotation = world.getComponent(entities[i], rotationId)?.world ?? 0;
      const visible = isVisibleInHierarchy(world, entities[i]);

      for (const particleEmitter of particleEmitterComponents[
        i
      ].emitters.values()) {
        particleEmitter.currentEmitDuration += deltaTimeInSeconds;

        startEmittingParticles(particleEmitter, random);

        emitNewParticles(
          particleEmitter,
          origin,
          rotation,
          random,
          world,
          visible,
        );

        emitParticleStream(
          particleEmitter,
          origin,
          rotation,
          deltaTimeInSeconds,
          random,
          world,
          visible,
        );
      }
    }
  },
});
