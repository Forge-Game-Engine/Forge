import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';

/**
 * Periodically knocks the entity's `PhysicsBodyEcsComponent`'s
 * `RigidBody.angularVelocity` off course by `strength` (alternating
 * direction each time), to demonstrate an `AngularVelocityMotorEcsComponent`
 * correcting back towards its `targetVelocity` afterwards. Modeled as a
 * direct angular velocity change (a pure couple, in physics terms) rather
 * than an off-center impulse, so it disturbs rotation only, without also
 * pushing the body off its fixed position.
 */
export interface GustEcsComponent {
  strength: number;
  intervalSeconds: number;
  elapsedSeconds: number;
  nextSign: number;
}

export const gustId = createComponentId<GustEcsComponent>('gust');

export interface GustOptions {
  strength: number;
  intervalSeconds: number;
}

export function addGustComponent(
  world: EcsWorld,
  entity: number,
  options: GustOptions,
): GustEcsComponent {
  const component: GustEcsComponent = {
    ...options,
    elapsedSeconds: 0,
    nextSign: 1,
  };

  return world.addComponent(entity, gustId, component);
}
