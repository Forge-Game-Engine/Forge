import { Entity, System } from '../../ecs';
import { Time } from '../../common';
import {
  MinMax,
  ParticleComponent,
  ParticleEmitter,
  ParticleEmitterComponent,
} from '../components';

/**
 * System that manages and updates particles.
 */
export class ParticleManagerSystem extends System {
  private readonly _time: Time;

  /**
   * Creates an instance of ParticleManagerSystem.
   * @param time - The Time instance.
   */
  constructor(time: Time) {
    super('particleManager', [ParticleEmitterComponent.symbol]);
    this._time = time;
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
      this._checkStartEmitting(particleEmitter);

      this._emitNewParticles(particleEmitter);

      this._updateParticles(particleEmitter);
    }
  }

  private _checkStartEmitting(particleEmitter: ParticleEmitter) {
    if (particleEmitter.startEmitting) {
      particleEmitter.emitStartTime = this._time.timeInSeconds;
      particleEmitter.startEmitting = false;
      particleEmitter.emitCount = 0;
      particleEmitter.currentlyEmitting = true;
      particleEmitter.amountToEmit = Math.round(
        this._getValueInRange(particleEmitter.numParticles),
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
      const speed = this._getValueInRange(particleEmitter.speed);

      const originalScale = this._getValueInRange(particleEmitter.scale);

      const lifetimeSeconds = this._getValueInRange(particleEmitter.lifetime);

      const rotation = this._getValueInRangeRadians(particleEmitter.rotation);

      const rotationSpeed = this._getValueInRange(
        particleEmitter.rotationSpeed,
      );

      particleEmitter.particles.push(
        new ParticleComponent({
          speed,
          originalScale,
          lifetimeSeconds,
          rotation,
          rotationSpeed,

          lifetimeScaleReduction: particleEmitter.lifetimeScaleReduction,
          height: particleEmitter.height,
          width: particleEmitter.width,
          positionX: particleEmitter.positionX,
          positionY: particleEmitter.positionY,
        }),
      );
      particleEmitter.emitCount++;
    }
  }

  private _getAmountToEmit(particleEmitter: ParticleEmitter) {
    const emitProgress = Math.min(
      (this._time.timeInSeconds - particleEmitter.emitStartTime) /
        particleEmitter.emitDuration,
      1,
    );
    const targetEmitCount = Math.ceil(
      emitProgress * particleEmitter.amountToEmit,
    );

    return targetEmitCount - particleEmitter.emitCount;
  }

  private _updateParticles(particleEmitter: ParticleEmitter) {
    for (let i = particleEmitter.particles.length - 1; i >= 0; i--) {
      const particle = particleEmitter.particles[i];

      if (particle.ageSeconds >= particle.lifetimeSeconds) {
        particleEmitter.particles.splice(i, 1);

        continue;
      }

      particle.update(this._time.deltaTimeInSeconds);
    }
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

    const range = (max - min) % (2 * Math.PI);

    if (range === 0 && max !== min) {
      return Math.random() * 2 * Math.PI;
    }

    return Math.random() * range + min;
  }
}
