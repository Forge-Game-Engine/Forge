import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Collider } from '../colliders/collider.js';
import { Aabb } from '../types/aabb.js';
import { withDefaults } from '../../utilities/with-defaults.js';

/**
 * A collision mask with every bit set: a collider (or ray) with this mask
 * accepts every category.
 */
export const allCollisionCategories = 0xffffffff;

/**
 * Fields of {@link ColliderEcsComponent} with a sensible default; callers
 * may omit these.
 */
export interface ColliderDefaultedOptions {
  /**
   * The Coulomb friction coefficient used when this entity is in contact
   * with another. `createCollisionResolutionEcsSystem` combines two
   * contacting colliders' friction via their geometric mean. Defaults to
   * `0.6`.
   */
  friction: number;

  /**
   * The restitution (bounciness) coefficient used when this entity is in
   * contact with another. `createCollisionResolutionEcsSystem` combines two
   * contacting colliders' restitution via their geometric mean. `0` doesn't
   * bounce. Defaults to `0.05`.
   */
  restitution: number;

  /**
   * The category bits this collider belongs to, usually a single bit
   * (`1 << n`). Up to 32 bits, as JavaScript's bitwise operators allow.
   * Two colliders are tested against each other only when each one's
   * `category` shares a bit with the other's `mask`. Defaults to `1`.
   */
  category: number;

  /**
   * The category bits this collider collides with. Defaults to
   * {@link allCollisionCategories}.
   */
  mask: number;

  /**
   * When `true`, overlaps with this collider are detected and reported
   * through `ContactsEcsComponent`, but never resolved: nothing bounces off
   * or is pushed by it. Use it for trigger zones and pickups. Defaults to
   * `false`.
   */
  sensor: boolean;
}

/**
 * Fields of {@link ColliderEcsComponent} with no default; callers must
 * provide these.
 */
export interface ColliderRequiredOptions {
  /**
   * The collision shape, in the entity's local space. A `'dynamic'`
   * `RigidBodyEcsComponent` on the same entity takes its mass, moment of
   * inertia and center of mass from it.
   */
  collider: Collider;
}

/**
 * ECS-style component interface for a collider: an entity's collision
 * shape and how it collides. An entity with a collider and a
 * `PositionEcsComponent` takes part in collision detection; one with no
 * `RigidBodyEcsComponent` is static. `RotationEcsComponent` is optional, and
 * an entity without one is treated as unrotated.
 */
export interface ColliderEcsComponent
  extends ColliderRequiredOptions, ColliderDefaultedOptions {
  /**
   * The collider's world-space bounds. Output only: written by
   * `createBroadPhaseEcsSystem` every tick, from the entity's world
   * position and rotation. Until the broad phase first runs, the box is
   * empty and overlaps nothing.
   */
  readonly aabb: Aabb;
}

export const colliderId = createComponentId<ColliderEcsComponent>('collider');

/**
 * Attaches a {@link ColliderEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - The collider shape, plus any options to override.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addColliderComponent(
  world: EcsWorld,
  entity: number,
  options: ColliderRequiredOptions & Partial<ColliderDefaultedOptions>,
): ColliderEcsComponent {
  const defaultColliderOptions: ColliderDefaultedOptions = {
    friction: 0.6,
    restitution: 0.05,
    category: 1,
    mask: allCollisionCategories,
    sensor: false,
  };

  const component: ColliderEcsComponent = {
    ...withDefaults(defaultColliderOptions, options),
    aabb: {
      min: { x: Infinity, y: Infinity },
      max: { x: -Infinity, y: -Infinity },
    },
  };

  return world.addComponent(entity, colliderId, component);
}
