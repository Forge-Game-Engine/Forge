import {
  ageScaleId,
  positionId,
  rotationId,
  scaleId,
  speedId,
  Time,
} from '../../common/index.js';
import { spriteId } from '../../rendering/index.js';
import { Random, Vector2 } from '../../math/index.js';
import {
  ParticleEmitter,
  ParticleEmitterEcsComponent,
  ParticleEmitterId,
  ParticleId,
} from '../index.js';
import { EcsSystem } from '../../new-ecs/ecs-system.js';
import { EcsWorld } from '../../new-ecs/ecs-world.js';
import {
  lifetimeId,
  RemoveFromWorldLifetimeStrategyId,
} from '../../lifecycle/index.js';

function startEmittingParticles(
  particleEmitter: ParticleEmitter,
  random: Random,
) {
  if (particleEmitter.startEmitting) {
    particleEmitter.currentEmitDuration = 0;
    particleEmitter.startEmitting = false;
    particleEmitter.emitCount = 0;
    particleEmitter.currentlyEmitting = true;
    particleEmitter.totalAmountToEmit = Math.round(
      random.randomFloat(
        particleEmitter.numParticlesRange.min,
        particleEmitter.numParticlesRange.max,
      ),
    );
  }
}

function getRandomValueInRangeDegrees(
  min: number,
  max: number,
  random: Random,
): number {
  const range = (max - min) % 360;

  if (range === 0 && max !== min) {
    return random.randomFloat(0, 360);
  }

  return random.randomFloat(min, min + range);
}

function emitParticle(
  particleEmitter: ParticleEmitter,
  random: Random,
  world: EcsWorld,
) {
  const speed = random.randomFloat(
    particleEmitter.speedRange.min,
    particleEmitter.speedRange.max,
  );

  const originalScale = random.randomFloat(
    particleEmitter.scaleRange.min,
    particleEmitter.scaleRange.max,
  );

  const lifetimeSeconds = random.randomFloat(
    particleEmitter.lifetimeSecondsRange.min,
    particleEmitter.lifetimeSecondsRange.max,
  );

  const rotation = getRandomValueInRangeDegrees(
    particleEmitter.rotationRange.min,
    particleEmitter.rotationRange.max,
    random,
  );

  const rotationSpeed = random.randomFloat(
    particleEmitter.rotationSpeedRange.min,
    particleEmitter.rotationSpeedRange.max,
  );

  const spawnPosition = particleEmitter.spawnPosition();

  const particleEntity = world.createEntity();

  world.addComponent(particleEntity, spriteId, {
    sprite: particleEmitter.sprite,
    enabled: true,
  });

  world.addComponent(particleEntity, ParticleId, {
    rotationSpeed,
  });

  world.addComponent(particleEntity, lifetimeId, {
    durationSeconds: lifetimeSeconds,
    elapsedSeconds: 0,
    hasExpired: false,
  });

  world.addTag(particleEntity, RemoveFromWorldLifetimeStrategyId);

  world.addComponent(particleEntity, ageScaleId, {
    originalScaleX: originalScale,
    originalScaleY: originalScale,
    finalLifetimeScaleX: particleEmitter.lifetimeScaleReduction,
    finalLifetimeScaleY: particleEmitter.lifetimeScaleReduction,
  });

  world.addComponent(particleEntity, positionId, {
    world: spawnPosition.clone(),
    local: spawnPosition.clone(),
  });

  world.addComponent(particleEntity, scaleId, {
    world: Vector2.one,
    local: new Vector2(originalScale, originalScale),
  });

  world.addComponent(particleEntity, rotationId, {
    world: 0,
    local: rotation,
  });

  world.addComponent(particleEntity, speedId, {
    speed,
  });
}

function getAmountToEmitBasedOnDuration(particleEmitter: ParticleEmitter) {
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
  random: Random,
  world: EcsWorld,
) {
  if (
    !particleEmitter.currentlyEmitting ||
    particleEmitter.emitCount >= particleEmitter.totalAmountToEmit
  ) {
    particleEmitter.currentlyEmitting = false;

    return;
  }

  const currentAmountToEmit = getAmountToEmitBasedOnDuration(particleEmitter);

  for (let i = 0; i < currentAmountToEmit; i++) {
    emitParticle(particleEmitter, random, world);
  }

  particleEmitter.emitCount += currentAmountToEmit;
}

/**
 * Creates an ECS system to handle particles.
 */
export const createParticleEcsSystem = (
  time: Time,
  random: Random,
): EcsSystem<[ParticleEmitterEcsComponent]> => ({
  query: [ParticleEmitterId],
  run: (result, world) => {
    const [particleEmitterComponent] = result.components;

    for (const particleEmitter of particleEmitterComponent.emitters.values()) {
      particleEmitter.currentEmitDuration += time.deltaTimeInSeconds;

      startEmittingParticles(particleEmitter, random);

      emitNewParticles(particleEmitter, random, world);
    }
  },
});
