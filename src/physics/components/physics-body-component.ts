import { createComponentId } from '../../ecs/ecs-component.js';
import type { RigidBody } from '../rigid-body.js';

/**
 * ECS-style component interface for a physics body.
 *
 * The position/rotation sync behavior of `createPhysicsEcsSystem` depends on
 * `physicsBody.isStatic` and `isKinematic`:
 *
 * - `isStatic: true`: the ECS position and rotation components drive the
 *   Matter body every frame (e.g. world boundary walls that never move).
 *   Because Matter's collision detector skips pairs where both bodies are
 *   static, a purely static body will not generate collision events with
 *   another static body.
 * - `isStatic: false` and `isKinematic: true`: the ECS position and rotation
 *   components drive the Matter body every frame, and the body still
 *   participates in collision detection (since it is not static). Use this
 *   for entities whose movement is controlled directly via ECS position
 *   mutation but which still need to raise collision events.
 * - `isStatic: false` and `isKinematic` unset/false: the Matter body drives
 *   the ECS position and rotation components every frame (the body is
 *   simulated normally by Matter).
 */
export interface PhysicsBodyEcsComponent {
  physicsBody: RigidBody;

  /**
   * Controls how this body's transform is synchronized with its ECS
   * `PositionEcsComponent`/`RotationEcsComponent`:
   * - Dynamic (`isStatic: false`, `isKinematic` not set or `false`): the
   *   physics simulation drives the body, and its resulting position/angle
   *   are written back to the ECS components every frame.
   * - Static (`isStatic: true`): the ECS position/angle drive the body, and
   *   the body never moves under simulation.
   * - Kinematic (`isStatic: false`, `isKinematic: true`): like static, the
   *   ECS position/angle drive the body every frame, but the body still
   *   participates in collision detection against other non-static bodies.
   *   Useful for entities whose movement is fully controlled by other ECS
   *   systems but that still need to generate collision events.
   */
  isKinematic?: boolean;
}

export const PhysicsBodyId =
  createComponentId<PhysicsBodyEcsComponent>('PhysicsBody');
