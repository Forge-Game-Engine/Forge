import { Entity, System } from '../../ecs';
import { Time } from '../../common';
import { ParticleComponent, ParticleEmitterComponent } from '../components';

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

    if (particleEmitterComponent.startEmitting) {
      particleEmitterComponent.emitStartTime = this._time.timeInSeconds;
      particleEmitterComponent.startEmitting = false;
      particleEmitterComponent.emitCount = 0;
      particleEmitterComponent.currentlyEmitting = true;
      particleEmitterComponent.amountToEmit = Math.floor(
        this._getValueInRange(
          particleEmitterComponent.minNumParticles,
          particleEmitterComponent.maxNumParticles,
        ) + 1,
      );
    }

    //create particles
    if (particleEmitterComponent.currentlyEmitting) {
      if (
        particleEmitterComponent.emitCount <
        particleEmitterComponent.amountToEmit
      ) {
        const progress = Math.min(
          (this._time.timeInSeconds - particleEmitterComponent.emitStartTime) /
            particleEmitterComponent.emitDuration,
          1,
        );
        const targetEmitCount = Math.floor(
          progress * particleEmitterComponent.amountToEmit,
        );
        const amountToEmit =
          targetEmitCount - particleEmitterComponent.emitCount;

        for (let i = 0; i < amountToEmit; i++) {
          const speed = this._getValueInRange(
            particleEmitterComponent.minSpeed,
            particleEmitterComponent.maxSpeed,
          );

          const originalScale = this._getValueInRange(
            particleEmitterComponent.minScale,
            particleEmitterComponent.maxScale,
          );

          const lifetimeSeconds = this._getValueInRange(
            particleEmitterComponent.minLifetime,
            particleEmitterComponent.maxLifetime,
          );

          const rotation = this._getValueInRangeRadians(
            particleEmitterComponent.minRotation,
            particleEmitterComponent.maxRotation,
          );

          const rotationSpeed = this._getValueInRange(
            particleEmitterComponent.minRotationSpeed,
            particleEmitterComponent.maxRotationSpeed,
          );

          const particle = new ParticleComponent(
            particleEmitterComponent.positionX,
            particleEmitterComponent.positionY,
            {
              speed,
              originalScale,
              scaleChangeFactor:
                particleEmitterComponent.lifetimeScaleReduction,
              height: particleEmitterComponent.height,
              width: particleEmitterComponent.width,
              rotation,
              rotationSpeed,
              lifetimeSeconds,
            },
          );

          particleEmitterComponent.particles.push(particle);
          particleEmitterComponent.emitCount++;
        }
      } else {
        particleEmitterComponent.currentlyEmitting = false;
      }
    }

    for (let i = particleEmitterComponent.particles.length - 1; i >= 0; i--) {
      const particle = particleEmitterComponent.particles[i];

      if (particle.ageSeconds >= particle.lifetimeSeconds) {
        particleEmitterComponent.particles.splice(i, 1);

        continue;
      }

      particle.update(this._time.deltaTimeInSeconds);
    }
  }

  private _getValueInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private _getValueInRangeRadians(min: number, max: number): number {
    const range = (max - min + Math.PI * 2) % (Math.PI * 2);

    return (Math.random() * range + min + Math.PI * 2) % (Math.PI * 2);
  }
}
