import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { RigidBody } from '@forge-game-engine/forge/physics';

/**
 * Periodically swings a hinged body open: since RevoluteJoint has no
 * built-in motor, this applies an impulse at a point offset from the body's
 * center (like pushing a door open near its handle, far from the hinge),
 * the same "scale an impulse and apply it every so often" approach
 * described in the Applying Forces guide. The joint immediately cancels the
 * impulse's component along the line to the hinge (translation is locked),
 * leaving only the torque that rotates the body about it.
 */
export interface PushEcsComponent {
  body: RigidBody;
  impulse: Vector2;

  /**
   * The point the impulse is applied at, relative to `body`'s center of
   * mass and unrotated by `body`'s angle (i.e. in `body`'s local space).
   * Rotated by `body`'s current angle each time the impulse triggers, so it
   * tracks the same physical point on the body as it swings.
   */
  localContactPoint: Vector2;
  intervalSeconds: number;
  elapsedSeconds: number;
}

export const pushId = createComponentId<PushEcsComponent>('push');

export interface PushOptions {
  body: RigidBody;
  impulse: Vector2;
  localContactPoint: Vector2;
  intervalSeconds: number;
}

export function addPushComponent(
  world: EcsWorld,
  entity: number,
  options: PushOptions,
): PushEcsComponent {
  const component: PushEcsComponent = {
    ...options,
    elapsedSeconds: 0,
  };

  return world.addComponent(entity, pushId, component);
}
