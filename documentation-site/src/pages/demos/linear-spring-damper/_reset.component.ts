import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { RigidBody } from '@forge-game-engine/forge/physics';

/**
 * Periodically teleports `body` back to the same position and velocity,
 * replaying an identical "just hit a bump" disturbance every
 * `intervalSeconds`. Used instead of repeatedly applying a fresh impulse:
 * an undamped `LinearSpring` never dissipates energy, so periodic impulses
 * that aren't synchronized to its oscillation phase can resonantly pump
 * energy into it without bound over a long-running demo. A hard reset keeps
 * every replay identical and bounded, no matter how long the page stays
 * open.
 */
export interface ResetEcsComponent {
  body: RigidBody;
  initialPosition: Vector2;
  initialVelocity: Vector2;
  intervalSeconds: number;
  elapsedSeconds: number;
}

export const resetId = createComponentId<ResetEcsComponent>('reset');

export interface ResetOptions {
  body: RigidBody;
  initialPosition: Vector2;
  initialVelocity: Vector2;
  intervalSeconds: number;
}

export function addResetComponent(
  world: EcsWorld,
  entity: number,
  options: ResetOptions,
): ResetEcsComponent {
  const component: ResetEcsComponent = {
    ...options,
    elapsedSeconds: 0,
  };

  return world.addComponent(entity, resetId, component);
}
