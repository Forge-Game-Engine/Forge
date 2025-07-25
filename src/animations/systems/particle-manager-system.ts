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

  private _emitNewParticles(particleEmitter: ParticleEmitter) {
    if (particleEmitter.currentlyEmitting) {
      if (particleEmitter.emitCount < particleEmitter.amountToEmit) {
        const progress = Math.min(
          (this._time.timeInSeconds - particleEmitter.emitStartTime) /
            particleEmitter.emitDuration,
          1,
        );
        const targetEmitCount = Math.floor(
          progress * particleEmitter.amountToEmit,
        );
        const amountToEmit = targetEmitCount - particleEmitter.emitCount;

        for (let i = 0; i < amountToEmit; i++) {
          const speed = this._getValueInRange(particleEmitter.speed);

          const originalScale = this._getValueInRange(particleEmitter.scale);

          const lifetimeSeconds = this._getValueInRange(
            particleEmitter.lifetime,
          );

          const rotation = this._getValueInRangeRadians(
            particleEmitter.rotation,
          );

          const rotationSpeed = this._getValueInRange(
            particleEmitter.rotationSpeed,
          );

          const particle = new ParticleComponent({
            speed,
            originalScale,
            lifetimeScaleReduction: particleEmitter.lifetimeScaleReduction,
            height: particleEmitter.height,
            width: particleEmitter.width,
            rotation,
            rotationSpeed,
            lifetimeSeconds,
            positionX: particleEmitter.positionX,
            positionY: particleEmitter.positionY,
          });

          particleEmitter.particles.push(particle);
          particleEmitter.emitCount++;
        }
      } else {
        particleEmitter.currentlyEmitting = false;
      }
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

    if (min === 0 && max === 2 * Math.PI) {
      return Math.random() * (2 * Math.PI);
    }

    const range = (max - min + Math.PI * 2) % (Math.PI * 2);

    return (Math.random() * range + min + Math.PI * 2) % (Math.PI * 2);
  }
}
