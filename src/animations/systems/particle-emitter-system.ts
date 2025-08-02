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

/**
 * System that manages and updates particles.
 */
export class ParticleEmitterSystem extends System {
  private readonly _time: Time;
  private readonly _world: World;

  /**
   * Creates an instance of ParticleManagerSystem.
   * @param world - The World instance.
   */
  constructor(world: World) {
    super('particleEmitter', [ParticleEmitterComponent.symbol]);
    this._time = world.time;
    this._world = world;
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
      particleEmitter.amountToEmit = Math.round(
        this._getValueInRange(particleEmitter.numParticlesRange),
      );
    }
  }

  private _emitNewParticles(particleEmitter: ParticleEmitter) {
    if (
      !particleEmitter.currentlyEmitting ||
      particleEmitter.emitCount >= particleEmitter.amountToEmit
    ) {
      particleEmitter.currentlyEmitting = false;

      return;
    }

    const amountToEmit = this._getAmountToEmit(particleEmitter);

    for (let i = 0; i < amountToEmit; i++) {
      const speed = this._getValueInRange(particleEmitter.speedRange);

      const originalScale = this._getValueInRange(particleEmitter.scaleRange);

      const lifetimeSeconds = this._getValueInRange(
        particleEmitter.lifetimeSecondsRange,
      );

      const rotation = this._getValueInRangeRadians(
        particleEmitter.rotationRange,
      );

      const rotationSpeed = this._getValueInRange(
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

      particleEmitter.emitCount++;
    }
  }

  private _getAmountToEmit(particleEmitter: ParticleEmitter) {
    const emitProgress = Math.min(
      particleEmitter.currentEmitDuration / particleEmitter.emitDurationSeconds,
      1,
    );
    const targetEmitCount = Math.ceil(
      emitProgress * particleEmitter.amountToEmit,
    );

    return targetEmitCount - particleEmitter.emitCount;
  }

  private _getValueInRange({ min, max }: MinMax): number {
    if (min > max) {
      [min, max] = [max, min];
    }

    return Math.random() * (max - min) + min;
  }

  private _getValueInRangeRadians({ min, max }: MinMax): number {
    if (min > max) {
      [min, max] = [max, min];
    }

    const range = (max - min) % 360;

    if (range === 0 && max !== min) {
      return Math.random() * 360;
    }

    return Math.random() * range + min;
  }
}
