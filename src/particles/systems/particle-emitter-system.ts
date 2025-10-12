import { Entity, System, World } from '../../ecs';
import {
  AgeComponent,
  AgeScaleComponent,
  PositionComponent,
  RotationComponent,
  ScaleComponent,
  SpeedComponent,
  Time,
} from '../../common';

import { SpriteComponent } from '../../rendering';
import { Random } from '../../math';
import {
  MinMaxRange,
  ParticleComponent,
  ParticleEmitter,
  ParticleEmitterComponent,
} from '../';
/**
 * System that emits particles based on ParticleEmitters
 */
export class ParticleEmitterSystem extends System {
  private readonly _time: Time;
  private readonly _world: World;
  private readonly _random: Random;

  /**
   * Creates an instance of ParticleEmitterSystem.
   * @param world - The World instance.
   */
  constructor(world: World) {
    super(Symbol('particleEmitter'), [ParticleEmitterComponent.symbol]);
    this._time = world.time;
    this._world = world;
    this._random = new Random();
  }

  /**
   * Runs the particle emitter system for a given entity.
   * @param entity - The entity to update particle emitters for.
   */
  public run(entity: Entity): void {
    const particleEmitterComponent =
      entity.getComponentRequired<ParticleEmitterComponent>(
        ParticleEmitterComponent.symbol,
      );

    for (const particleEmitter of particleEmitterComponent.emitters.values()) {
      particleEmitter.currentEmitDuration += this._time.deltaTimeInSeconds;

      this._startEmittingParticles(particleEmitter);

      this._emitNewParticles(particleEmitter);
    }
  }

  /**
   * Starts emitting particles from the emitter if `startEmitting` is set to true.
   * This will reset the current emit duration and start the emission process,
   * as well as choose a number of particles to emit.
   * @param particleEmitter The particle emitter to start emitting from.
   */
  private _startEmittingParticles(particleEmitter: ParticleEmitter) {
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

  /**
   * Emits new particles from the emitter.
   * Emits a portion of the total amount to emit, based on emit duration.
   * If emit duration is zero, it will immediately emit all particles.
   * @param particleEmitter The particle emitter to emit particles from.
   */
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
      this._emitParticle(particleEmitter);
    }

    particleEmitter.emitCount += currentAmountToEmit;
  }

  /**
   * Emits a single particle from the given particle emitter.
   * @param particleEmitter The particle emitter to emit a particle from.
   */
  private _emitParticle(particleEmitter: ParticleEmitter) {
    const speed = this._getRandomValueInRange(particleEmitter.speedRange);

    const originalScale = this._getRandomValueInRange(
      particleEmitter.scaleRange,
    );

    const lifetimeSeconds = this._getRandomValueInRange(
      particleEmitter.lifetimeSecondsRange,
    );

    const rotation = this._getRandomValueInRangeDegrees(
      particleEmitter.rotationRange,
    );

    const rotationSpeed = this._getRandomValueInRange(
      particleEmitter.rotationSpeedRange,
    );

    const spawnPosition = particleEmitter.spawnPosition();

    this._world.buildAndAddEntity('particle', [
      new SpriteComponent(particleEmitter.sprite),
      new ParticleComponent({
        rotationSpeed,
      }),
      new AgeComponent(lifetimeSeconds),
      new AgeScaleComponent(
        originalScale,
        originalScale,
        particleEmitter.lifetimeScaleReduction,
        particleEmitter.lifetimeScaleReduction,
      ),
      new PositionComponent(spawnPosition.x, spawnPosition.y),
      new ScaleComponent(originalScale, originalScale),
      new RotationComponent(rotation),
      new SpeedComponent(speed),
    ]);
  }

  /**
   * Gets the amount of particles to emit based on the current emit duration.
   * @param particleEmitter The particle emitter to get the amount from.
   * @returns The number of particles to emit.
   */
  private _getAmountToEmitBasedOnDuration(particleEmitter: ParticleEmitter) {
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

  /**
   * Gets a random value within the specified range.
   * If min > max, swaps min and max.
   * @param minMax The range to get the random value from.
   * @returns A random value within the specified range.
   */
  private _getRandomValueInRange({ min, max }: MinMaxRange): number {
    if (min > max) {
      [min, max] = [max, min];
    }

    return this._random.randomFloat(min, max);
  }

  /**
   * Gets a random value within the specified range in degrees.
   * If min > max, swaps min and max.
   * @param minMax The range to get the random value from.
   * @returns A random value within the specified range, from 0-360 degrees
   */
  private _getRandomValueInRangeDegrees({ min, max }: MinMaxRange): number {
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
