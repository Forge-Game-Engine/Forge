import type { Body } from 'matter-js';
import { createComponentId } from '../../ecs/ecs-component.js';

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
  /**
   * The underlying Matter.js body.
   */
  physicsBody: Body;

  /**
   * When `true` and `physicsBody.isStatic` is `false`, the ECS position and
   * rotation components drive this body's position and angle every frame
   * instead of the body driving the ECS components. Has no effect when
   * `physicsBody.isStatic` is `true`.
   */
  isKinematic?: boolean;
}

export const PhysicsBodyId =
  createComponentId<PhysicsBodyEcsComponent>('PhysicsBody');
