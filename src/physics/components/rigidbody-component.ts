import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';

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
 * Fields of {@link RigidBodyEcsComponent} with a sensible default; callers
 * may omit these.
 */
export interface RigidBodyDefaultedOptions {
  velocity: Vector2;
  angularVelocity: number;
  /**
   * Damps `angularVelocity` each tick, proportional to itself; `0` disables
   * damping. Applied by {@link createEulerIntegrationEcsSystem}.
   */
  angularDrag: number;

  /**
   * How this body participates in the simulation. Defaults to `'dynamic'`.
   * See {@link RigidBodyType}.
   */
  type: RigidBodyType;
}

export interface RigidBodyRequiredOptions {
  mass: number;
  momentOfInertia: number;
}

/**
 * ECS-style component interface for a rigid body.
 */
export interface RigidBodyEcsComponent
  extends RigidBodyDefaultedOptions, RigidBodyRequiredOptions {}

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
  options: RigidBodyRequiredOptions & Partial<RigidBodyEcsComponent>,
): RigidBodyEcsComponent {
  const defaultRigidBodyOptions: RigidBodyDefaultedOptions = {
    velocity: Vec2.zero,
    angularVelocity: 0,
    angularDrag: 0,
    type: 'dynamic',
  };

  const component: RigidBodyEcsComponent = {
    ...defaultRigidBodyOptions,
    ...options,
  };

  return world.addComponent(entity, rigidBodyId, component);
}
