import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/index.js';

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
    velocity: Vector2.zero,
    angularVelocity: 0,
    angularDrag: 0,
  };

  const component: RigidBodyEcsComponent = {
    ...defaultRigidBodyOptions,
    ...options,
  };

  return world.addComponent(entity, rigidBodyId, component);
}
