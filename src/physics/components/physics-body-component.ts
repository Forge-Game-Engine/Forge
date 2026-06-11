import { createComponentId } from '../../ecs/ecs-component.js';
import type { RigidBody } from '../rigid-body.js';

/**
 * ECS-style component interface for a physics body.
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
