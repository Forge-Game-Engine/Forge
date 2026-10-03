import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/vector2.js';
import {
  SpriteEcsComponent,
  SpriteRequiredOptions,
} from '../../rendering/components/sprite-component.js';
import { ParticleVelocityOffsetFunction } from './particle-component.js';

/**
 * Interface for range values with a min and max value.
 * The real value will be randomly chosen between min and max
 */
export interface Range {
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
 * Every particle spawns exactly at the emitter's origin.
 */
export interface PointParticleSpawnShape {
  type: 'point';
}

/**
 * Particles spawn anywhere inside a circle, evenly spread over its area.
 */
export interface CircleParticleSpawnShape {
  type: 'circle';

  /** The circle's radius, in world units. */
  radius: number;
}

/**
 * Particles spawn on the edge of a circle.
 */
export interface RingParticleSpawnShape {
  type: 'ring';

  /** The ring's radius, in world units. */
  radius: number;
}

/**
 * Particles spawn anywhere inside a box centered on the emitter's origin.
 */
export interface BoxParticleSpawnShape {
  type: 'box';

  /** The box's width, in world units. */
  width: number;

  /** The box's height, in world units. */
  height: number;
}

/**
 * The area, around the emitter's origin, that particles spawn in.
 */
export type ParticleSpawnShape =
  | PointParticleSpawnShape
  | CircleParticleSpawnShape
  | RingParticleSpawnShape
  | BoxParticleSpawnShape;

/**
 * The opacity a particle fades between over its lifetime.
 */
export interface ParticleLifetimeOpacity {
  /** The opacity when the particle spawns, from `0` to `1`. */
  start: number;

  /** The opacity at the end of the particle's lifetime, from `0` to `1`. */
  end: number;
}

/**
 * Called once for every particle right after it spawns, with all of its
 * components already attached. Use it to add your own components or tags
 * to the particle.
 */
export type ParticleSpawnedCallback = (
  world: EcsWorld,
  particle: number,
) => void;

/**
 * The sprite a particle emitter draws its particles with. Takes a
 * `SpriteEcsComponent` (for example from `createImageSprite`) or a `Sprite`
 * (from `createSprite`): any field a `Sprite` lacks, such as `enabled` or
 * `layer`, gets the same default `addSpriteComponent` gives it.
 */
export type ParticleSprite = SpriteRequiredOptions &
  Partial<SpriteEcsComponent>;

/**
 * Interface for particle emitter options.
 */
export interface ParticleEmitterOptions {
  /**
   * The range for the number of particles one `emit()` spawns, and the
   * default number `emitParticleBurst` spawns.
   * @default { min: 5, max: 10 }
   */
  numParticlesRange: Range;
  /**
   * The range for the speed particles spawn with, in world units per second.
   * @default { min: 10, max: 20 }
   */
  speedRange: Range;
  /**
   * The range for the direction particles move in when they spawn, in
   * degrees. 0 points up and angles increase clockwise (90 is right). Ignored
   * when `emitOutward` is `true`, except for particles spawned at the shape's
   * exact center.
   * @default { min: 0, max: 360 }
   */
  directionRange: Range;
  /**
   * The range for the scale of particles.
   * @default { min: 1, max: 1 }
   */
  scaleRange: Range;
  /**
   * The range for the initial rotation of each particle's sprite, in
   * degrees, counter-clockwise. This only turns the sprite; it doesn't change
   * the direction the particle moves in.
   * @default { min: 0, max: 0 }
   */
  rotationRange: Range;
  /**
   * The range for how fast each particle's sprite spins, in radians per
   * second.
   * @default { min: 0, max: 0 }
   */
  rotationSpeedRange: Range;
  /**
   * The range for the lifetime of particles in seconds.
   * @default { min: 1, max: 3 }
   */
  lifetimeSecondsRange: Range;
  /**
   * The factor by which the particle scale reduces over its lifetime.
   * The particle scale at the end of its lifetime will be scale * lifetimeScaleReduction
   * @default 0
   */
  lifetimeScaleReduction: number;
  /**
   * The opacity each particle fades between over its lifetime. Needs
   * `createParticleOpacityEcsSystem`.
   * @default { start: 1, end: 1 }
   */
  lifetimeOpacity: ParticleLifetimeOpacity;
  /**
   * A constant acceleration, in world units per second squared, applied to
   * every particle. For example `{ x: 0, y: -9.8 }` for gravity.
   * @default { x: 0, y: 0 }
   */
  acceleration: Vector2;
  /**
   * The share of a particle's velocity it keeps after one second, from `0`
   * to `1`. `1` means no drag.
   * @default 1
   */
  drag: number;
  /**
   * The area, centered on the emitter's origin, that particles spawn in. The
   * origin is the world position of the entity the emitter is on, or the
   * position passed to `emitParticleBurst`.
   * @default { type: 'point' }
   */
  spawnShape: ParticleSpawnShape;
  /**
   * When `true`, each particle moves away from the center of `spawnShape`,
   * through the point it spawned at, instead of in a direction picked from
   * `directionRange`.
   * @default false
   */
  emitOutward: boolean;
  /**
   * The duration over which one `emit()` spreads its particles. `0` spawns
   * them all at once.
   * @default 0
   */
  emitDurationSeconds: number;
  /**
   * How many particles a second the emitter spawns steadily, for as long as
   * it's above `0`, on top of anything `emit()` spawns.
   * @default 0
   */
  emissionRate: number;
  /**
   * An extra velocity every particle reads each frame and adds to its own,
   * for motion that follows game state, such as a world that scrolls past.
   * @default undefined
   */
  getVelocityOffset?: ParticleVelocityOffsetFunction;
  /**
   * Called for every particle right after it spawns.
   * @default undefined
   */
  onParticleSpawned?: ParticleSpawnedCallback;
}

const defaultOptions: ParticleEmitterOptions = {
  numParticlesRange: { min: 5, max: 10 },
  speedRange: { min: 10, max: 20 },
  directionRange: { min: 0, max: 360 },
  scaleRange: { min: 1, max: 1 },
  rotationRange: { min: 0, max: 0 },
  rotationSpeedRange: { min: 0, max: 0 },
  lifetimeSecondsRange: { min: 1, max: 3 },
  lifetimeScaleReduction: 0,
  lifetimeOpacity: { start: 1, end: 1 },
  acceleration: Vec2.zero,
  drag: 1,
  spawnShape: { type: 'point' },
  emitOutward: false,
  emitDurationSeconds: 0,
  emissionRate: 0,
};

function assertValidOptions(options: ParticleEmitterOptions): void {
  if (options.drag < 0 || options.drag > 1) {
    throw new Error(
      `Particle emitter "drag" must be between 0 and 1, but was ${options.drag}.`,
    );
  }

  if (options.emissionRate < 0) {
    throw new Error(
      `Particle emitter "emissionRate" can't be negative, but was ${options.emissionRate}.`,
    );
  }
}

/**
 * Represents a particle Emitter.
 * This class is used to define properties and behavior for particles emitters,
 * to configure the spawning and function of the particles.
 */
export class ParticleEmitter {
  public sprite: ParticleSprite;
  public numParticlesRange: Range;
  public speedRange: Range;
  public directionRange: Range;
  public scaleRange: Range;
  public rotationRange: Range;
  public rotationSpeedRange: Range;
  public lifetimeSecondsRange: Range;
  public lifetimeScaleReduction: number;
  public lifetimeOpacity: ParticleLifetimeOpacity;
  public acceleration: Vector2;
  public drag: number;
  public spawnShape: ParticleSpawnShape;
  public emitOutward: boolean;
  public emitDurationSeconds: number;
  public emissionRate: number;
  public getVelocityOffset?: ParticleVelocityOffsetFunction;
  public onParticleSpawned?: ParticleSpawnedCallback;
  public currentEmitDuration: number;
  public emitCount: number;
  public totalAmountToEmit: number;
  public startEmitting: boolean;
  public currentlyEmitting: boolean;
  /**
   * The fraction of a particle `emissionRate` has built up but not spawned
   * yet, carried between frames so a rate that isn't a multiple of the frame
   * rate still averages out.
   */
  public emissionRemainder: number;

  /**
   * Creates a new ParticleEmitter instance.
   * @param sprite The sprite to draw the particles with. Every particle gets
   * its own copy, so changing one particle's sprite never changes another's.
   * The particles are drawn on `sprite.layer`.
   * @param options The options to configure the particle emitter.
   * @throws An error if `drag` isn't between 0 and 1, or `emissionRate` is
   * negative.
   */
  constructor(
    sprite: ParticleSprite,
    options: Partial<ParticleEmitterOptions> = {},
  ) {
    const resolvedOptions: ParticleEmitterOptions = {
      ...defaultOptions,
      ...options,
    };

    assertValidOptions(resolvedOptions);

    this.sprite = sprite;
    this.numParticlesRange = resolvedOptions.numParticlesRange;
    this.speedRange = resolvedOptions.speedRange;
    this.directionRange = resolvedOptions.directionRange;
    this.scaleRange = resolvedOptions.scaleRange;
    this.rotationRange = resolvedOptions.rotationRange;
    this.rotationSpeedRange = resolvedOptions.rotationSpeedRange;
    this.lifetimeSecondsRange = resolvedOptions.lifetimeSecondsRange;
    this.lifetimeScaleReduction = resolvedOptions.lifetimeScaleReduction;
    this.lifetimeOpacity = resolvedOptions.lifetimeOpacity;
    this.acceleration = resolvedOptions.acceleration;
    this.drag = resolvedOptions.drag;
    this.spawnShape = resolvedOptions.spawnShape;
    this.emitOutward = resolvedOptions.emitOutward;
    this.emitDurationSeconds = resolvedOptions.emitDurationSeconds;
    this.emissionRate = resolvedOptions.emissionRate;
    this.getVelocityOffset = resolvedOptions.getVelocityOffset;
    this.onParticleSpawned = resolvedOptions.onParticleSpawned;
    this.currentEmitDuration = 0;
    this.emitCount = 0;
    this.totalAmountToEmit = 0;
    this.startEmitting = false;
    this.currentlyEmitting = false;
    this.emissionRemainder = 0;
  }

  /**
   * Sets the options for the particle emitter. Options left out keep their
   * current value. Particles that have already spawned aren't affected.
   * @param options The options to configure the particle emitter.
   * @throws An error if `drag` isn't between 0 and 1, or `emissionRate` is
   * negative.
   */
  public setOptions(options: Partial<ParticleEmitterOptions>): void {
    const resolvedOptions: ParticleEmitterOptions = {
      ...this,
      ...options,
    };

    assertValidOptions(resolvedOptions);

    this.numParticlesRange = resolvedOptions.numParticlesRange;
    this.speedRange = resolvedOptions.speedRange;
    this.directionRange = resolvedOptions.directionRange;
    this.scaleRange = resolvedOptions.scaleRange;
    this.rotationRange = resolvedOptions.rotationRange;
    this.rotationSpeedRange = resolvedOptions.rotationSpeedRange;
    this.lifetimeSecondsRange = resolvedOptions.lifetimeSecondsRange;
    this.lifetimeScaleReduction = resolvedOptions.lifetimeScaleReduction;
    this.lifetimeOpacity = resolvedOptions.lifetimeOpacity;
    this.acceleration = resolvedOptions.acceleration;
    this.drag = resolvedOptions.drag;
    this.spawnShape = resolvedOptions.spawnShape;
    this.emitOutward = resolvedOptions.emitOutward;
    this.emitDurationSeconds = resolvedOptions.emitDurationSeconds;
    this.emissionRate = resolvedOptions.emissionRate;
    this.getVelocityOffset = resolvedOptions.getVelocityOffset;
    this.onParticleSpawned = resolvedOptions.onParticleSpawned;
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
