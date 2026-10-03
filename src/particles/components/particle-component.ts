import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/vector2.js';

/**
 * A function returning a velocity, in world units per second, that's added
 * to a particle's own velocity when it moves each frame. It's read every
 * frame, so it can follow game state (for example how fast the world is
 * scrolling past).
 */
export type ParticleVelocityOffsetFunction = () => Vector2;

/**
 * ECS-style component interface for a particle.
 */
export interface ParticleEcsComponent {
  /**
   * The particle's velocity, in world units per second. Changed every frame
   * by `acceleration` and `drag`, and free for game code to change too.
   */
  velocity: Vector2;

  /**
   * A constant acceleration, in world units per second squared, added to
   * `velocity` every frame. Covers gravity and steady drift alike.
   */
  acceleration: Vector2;

  /**
   * The share of `velocity` kept after one second, from `0` to `1`. `1`
   * means no drag, `0.25` means the particle keeps a quarter of its speed
   * after one second.
   */
  drag: number;

  /**
   * How fast the particle spins, in radians per second. Spin only changes
   * the particle's `RotationEcsComponent`, never the direction it moves in.
   */
  rotationSpeed: number;

  /**
   * The particle's sprite opacity when it spawns, from `0` to `1`.
   */
  startOpacity: number;

  /**
   * The particle's sprite opacity at the end of its lifetime, from `0` to
   * `1`. `createParticleOpacityEcsSystem` blends from `startOpacity` to
   * this.
   */
  endOpacity: number;

  /**
   * An extra velocity read every frame and added to `velocity` when the
   * particle moves. Unlike `velocity`, `drag` doesn't slow it down.
   */
  getVelocityOffset?: ParticleVelocityOffsetFunction;
}

export const ParticleId = createComponentId<ParticleEcsComponent>('Particle');

/**
 * Attaches a {@link ParticleEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the particle.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addParticleComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<ParticleEcsComponent> = {},
): ParticleEcsComponent {
  // Built inside the function body (rather than as a shared module-level
  // default) since `velocity` and `acceleration` are mutated in place, so
  // each particle needs its own `Vector2` instances.
  const defaultParticleOptions: ParticleEcsComponent = {
    velocity: Vec2.zero,
    acceleration: Vec2.zero,
    drag: 1,
    rotationSpeed: 0,
    startOpacity: 1,
    endOpacity: 1,
  };

  const component: ParticleEcsComponent = {
    ...defaultParticleOptions,
    ...options,
  };

  return world.addComponent(entity, ParticleId, component);
}
