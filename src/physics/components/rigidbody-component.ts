import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';
import { withDefaults } from '../../utilities/with-defaults.js';

/**
 * How a {@link RigidBodyEcsComponent} participates in the simulation:
 *
 * - `'dynamic'`: fully simulated. Affected by gravity, forces, and impulses;
 *   pushed apart by collisions; integrated into position every tick.
 * - `'kinematic'`: moved directly by game code (by setting `velocity`, or
 *   position itself). Not affected by gravity, forces, or collision
 *   impulses, but still integrated into position from `velocity` every tick
 *   and still pushes dynamic bodies it contacts. Use this for moving
 *   platforms and other scripted movers that dynamic bodies should react to.
 * - `'static'`: never moves and is never integrated, with infinite effective
 *   mass in the solver. Equivalent to an entity with no
 *   `RigidBodyEcsComponent` at all (the convention every collider-only
 *   entity, e.g. `TerrainCollider` ground, already follows); attaching a
 *   `RigidBodyEcsComponent` with this type is only useful when other
 *   components on the entity (e.g. a motor or joint) require one to be
 *   present.
 */
export type RigidBodyType = 'dynamic' | 'kinematic' | 'static';

/**
 * ECS-style component interface for a rigid body.
 *
 * A body's mass, moment of inertia and center of mass aren't stored here: a
 * `'dynamic'` body takes them from the `Collider` in its entity's
 * `ColliderEcsComponent` (see `getRigidBodyMassData`), which computes them from
 * the shape and its density.
 */
export interface RigidBodyEcsComponent {
  /**
   * The world-space velocity of the body's center of mass. For a
   * `'dynamic'` body that's its collider's centroid, which needn't be the
   * entity's origin; for every other body it's the entity's origin.
   * Defaults to `(0, 0)`.
   */
  velocity: Vector2;
  /**
   * The body's angular velocity, in radians/second. Positive turns
   * counter-clockwise. Defaults to `0`.
   */
  angularVelocity: number;
  /**
   * Damps `angularVelocity` each tick, proportional to itself; `0` disables
   * damping. Applied by {@link createEulerIntegrationEcsSystem}. Defaults
   * to `0`.
   */
  angularDrag: number;

  /**
   * How this body participates in the simulation. Defaults to `'dynamic'`.
   * See {@link RigidBodyType}.
   */
  type: RigidBodyType;
}

export const rigidBodyId =
  createComponentId<RigidBodyEcsComponent>('f-rigid-body');

/**
 * Attaches a {@link RigidBodyEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the rigid body.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addRigidBodyComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<RigidBodyEcsComponent> = {},
): RigidBodyEcsComponent {
  const defaultRigidBodyOptions: RigidBodyEcsComponent = {
    velocity: Vec2.zero,
    angularVelocity: 0,
    angularDrag: 0,
    type: 'dynamic',
  };

  const component: RigidBodyEcsComponent = withDefaults(
    defaultRigidBodyOptions,
    options,
  );

  return world.addComponent(entity, rigidBodyId, component);
}
