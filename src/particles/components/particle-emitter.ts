import { ForgeRenderLayer, Sprite } from '../../rendering/index.js';

/**
 * Type for a function that returns a number representing the X and Y spawn position of the particle
 */
export type ParticleSpawnPositionFunction = () => { x: number; y: number };

/**
 * Interface for range values with a min and max value.
 * The real value will be randomly chosen between min and max
 */
export interface MinMaxRange {
  /**
   * The minimum value of the range.
   */
  min: number;
  /**
   * The maximum value of the range.
   */
  max: number;
}

/**
 * Interface for particle emitter options.
 */
export interface ParticleEmitterOptions {
  /**
   * The range for the number of particles emitted.
   * @default { min: 5, max: 10 }
   */
  numParticlesRange: MinMaxRange;
  /**
   * The range for the speed of particles.
   * @default { min: 10, max: 20 }
   */
  speedRange: MinMaxRange;
  /**
   * The range for the scale of particles.
   * @default { min: 1, max: 1 }
   */
  scaleRange: MinMaxRange;
  /**
   * The range for the initial rotation of particles, in degrees.
   * @default { min: 0, max: 360 }
   */
  rotationRange: MinMaxRange;
  /**
   * The range for the rotational speed of particles.
   * @default { min: 0, max: 0 }
   */
  rotationSpeedRange: MinMaxRange;
  /**
   * The range for the lifetime of particles in seconds.
   * @default { min: 1, max: 3 }
   */
  lifetimeSecondsRange: MinMaxRange;
  /**
   * The factor by which the particle scale reduces over its lifetime.
   * The particle scale at the end of its lifetime will be scale * lifetimeScaleReduction
   * @default 0
   */
  lifetimeScaleReduction: number;
  /**
   * The duration for which the emitter will emit particles.
   * @default 0
   */
  emitDurationSeconds: number;
  /**
   * The function to determine the X and Y spawn positions of the emitted particles.
   * @default () => {x: 0, y: 0 },
   */
  spawnPosition: ParticleSpawnPositionFunction;
}

const defaultOptions: ParticleEmitterOptions = {
  numParticlesRange: { min: 5, max: 10 },
  speedRange: { min: 10, max: 20 },
  scaleRange: { min: 1, max: 1 },
  rotationRange: { min: 0, max: 360 },
  rotationSpeedRange: { min: 0, max: 0 },
  lifetimeSecondsRange: { min: 1, max: 3 },
  lifetimeScaleReduction: 0,
  emitDurationSeconds: 0,
  spawnPosition: () => ({ x: 0, y: 0 }),
};

/**
 * Represents a particle Emitter.
 * This class is used to define properties and behavior for particles emitters,
 * to configure the spawning and function of the particles.
 */
export class ParticleEmitter {
  public sprite: Sprite;
  public renderLayer: ForgeRenderLayer;
  public spawnPosition: ParticleSpawnPositionFunction;
  public numParticlesRange: MinMaxRange;
  public speedRange: MinMaxRange;
  public scaleRange: MinMaxRange;
  public rotationRange: MinMaxRange;
  public rotationSpeedRange: MinMaxRange;
  public lifetimeSecondsRange: MinMaxRange;
  public lifetimeScaleReduction: number;
  public emitDurationSeconds: number;
  public currentEmitDuration: number;
  public emitCount: number;
  public totalAmountToEmit: number;
  public startEmitting: boolean;
  public currentlyEmitting: boolean;

  /**
   * Creates a new ParticleEmitter instance.
   * @param sprite The sprite to use for the particles.
   * @param renderLayer The render layer to use for the particles.
   * @param options The options to configure the particle emitter.
   */
  constructor(
    sprite: Sprite,
    renderLayer: ForgeRenderLayer,
    options: Partial<ParticleEmitterOptions> = {},
  ) {
    const {
      numParticlesRange,
      speedRange,
      scaleRange,
      rotationRange,
      rotationSpeedRange,
      lifetimeSecondsRange,
      lifetimeScaleReduction,
      emitDurationSeconds,
      spawnPosition,
    } = {
      ...defaultOptions,
      ...options,
    };
    this.sprite = sprite;
    this.renderLayer = renderLayer;
    this.numParticlesRange = numParticlesRange;
    this.speedRange = speedRange;
    this.scaleRange = scaleRange;
    this.rotationRange = rotationRange;
    this.rotationSpeedRange = rotationSpeedRange;
    this.lifetimeSecondsRange = lifetimeSecondsRange;
    this.lifetimeScaleReduction = lifetimeScaleReduction;
    this.emitDurationSeconds = emitDurationSeconds;
    this.spawnPosition = spawnPosition;
    this.currentEmitDuration = 0;
    this.emitCount = 0;
    this.totalAmountToEmit = 0;
    this.startEmitting = false;
    this.currentlyEmitting = false;
  }

  /**
   * Sets the options for the particle emitter.
   * @param options The options to configure the particle emitter.
   */
  public setOptions(options: Partial<ParticleEmitterOptions>): void {
    const {
      numParticlesRange,
      speedRange,
      scaleRange,
      rotationRange,
      rotationSpeedRange,
      lifetimeSecondsRange,
      lifetimeScaleReduction,
      emitDurationSeconds: emitDurationSeconds,
      spawnPosition,
    } = {
      ...this,
      ...options,
    };

    this.numParticlesRange = numParticlesRange;
    this.speedRange = speedRange;
    this.scaleRange = scaleRange;
    this.rotationRange = rotationRange;
    this.rotationSpeedRange = rotationSpeedRange;
    this.lifetimeSecondsRange = lifetimeSecondsRange;
    this.lifetimeScaleReduction = lifetimeScaleReduction;
    this.emitDurationSeconds = emitDurationSeconds;
    this.spawnPosition = spawnPosition;
  }

  /**
   * Emits particles from the emitter if it is not already emitting.
   * If already emitting, this function call does nothing.
   */
  public emitIfNotEmitting(): void {
    if (!this.currentlyEmitting) {
      this.startEmitting = true;
    }
  }

  /**
   * Starts emitting particles from the emitter immediately.
   */
  public emit(): void {
    this.startEmitting = true;
  }
}
