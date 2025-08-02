import { Entity, System, World } from '../../ecs';
import {
  PositionComponent,
  RotationComponent,
  ScaleComponent,
  Time,
} from '../../common';
import {
  AgeComponent,
  MinMax,
  ParticleComponent,
  ParticleEmitter,
  ParticleEmitterComponent,
} from '../components';
import { SpriteComponent } from '../../rendering';
import { Random } from '../../math';

/**
 * System that manages and updates particles.
 */
export class ParticleEmitterSystem extends System {
  private readonly _time: Time;
  private readonly _world: World;
  private readonly _random: Random;

  /**
   * Creates an instance of ParticleManagerSystem.
   * @param world - The World instance.
   */
  constructor(world: World) {
    super('particleEmitter', [ParticleEmitterComponent.symbol]);
    this._time = world.time;
    this._world = world;
    this._random = new Random();
  }

  /**
   * Runs the animation system for a given entity.
   * @param entity - The entity to update animations for.
   */
  public run(entity: Entity): void {
    const particleEmitterComponent =
      entity.getComponentRequired<ParticleEmitterComponent>(
        ParticleEmitterComponent.symbol,
      );

    for (const particleEmitter of particleEmitterComponent.emitters.values()) {
      particleEmitter.currentEmitDuration += this._time.deltaTimeInSeconds;

      this._checkStartEmitting(particleEmitter);

      this._emitNewParticles(particleEmitter);
    }
  }

  private _checkStartEmitting(particleEmitter: ParticleEmitter) {
    if (particleEmitter.startEmitting) {
      particleEmitter.currentEmitDuration = 0;
      particleEmitter.startEmitting = false;
      particleEmitter.emitCount = 0;
      particleEmitter.currentlyEmitting = true;
      particleEmitter.totalAmountToEmit = Math.round(
        this._getRandomValueInRange(particleEmitter.numParticlesRange),
      );
    }
  }

  private _emitNewParticles(particleEmitter: ParticleEmitter) {
    if (
      !particleEmitter.currentlyEmitting ||
      particleEmitter.emitCount >= particleEmitter.totalAmountToEmit
    ) {
      particleEmitter.currentlyEmitting = false;

      return;
    }

    const currentAmountToEmit =
      this._getAmountToEmitBasedOnDuration(particleEmitter);

    for (let i = 0; i < currentAmountToEmit; i++) {
      const speed = this._getRandomValueInRange(particleEmitter.speedRange);

      const originalScale = this._getRandomValueInRange(
        particleEmitter.scaleRange,
      );

      const lifetimeSeconds = this._getRandomValueInRange(
        particleEmitter.lifetimeSecondsRange,
      );

      const rotation = this._getRandomValueInRangeRadians(
        particleEmitter.rotationRange,
      );

      const rotationSpeed = this._getRandomValueInRange(
        particleEmitter.rotationSpeedRange,
      );

      this._world.buildAndAddEntity('particle', [
        new SpriteComponent(particleEmitter.sprite),
        new ParticleComponent({
          speed,
          originalScale,
          lifetimeScaleReduction: particleEmitter.lifetimeScaleReduction,
          rotationSpeed,
        }),
        new AgeComponent(lifetimeSeconds),
        new PositionComponent(
          particleEmitter.positionX(),
          particleEmitter.positionY(),
        ),
        new ScaleComponent(originalScale, originalScale),
        new RotationComponent(rotation),
      ]);
    }

    particleEmitter.emitCount += currentAmountToEmit;
  }

  private _getAmountToEmitBasedOnDuration(particleEmitter: ParticleEmitter) {
    const emitProgress = Math.min(
      particleEmitter.currentEmitDuration / particleEmitter.emitDurationSeconds,
      1,
    );
    const targetEmitCount = Math.ceil(
      emitProgress * particleEmitter.totalAmountToEmit,
    );

    return targetEmitCount - particleEmitter.emitCount;
  }

  private _getRandomValueInRange({ min, max }: MinMax): number {
    if (min > max) {
      [min, max] = [max, min];
    }

    return this._random.randomFloat(min, max);
  }

  private _getRandomValueInRangeRadians({ min, max }: MinMax): number {
    if (min > max) {
      [min, max] = [max, min];
    }

    const range = (max - min) % 360;

    if (range === 0 && max !== min) {
      return this._random.randomFloat(0, 360);
    }

    return this._random.randomFloat(min, min + range);
  }
}
