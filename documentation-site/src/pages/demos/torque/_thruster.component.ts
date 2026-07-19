import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { HoldAction } from '@forge-game-engine/forge/input';

/**
 * Drives an `AppliedTorqueEcsComponent` on the same entity from a
 * `HoldAction`: `torque` while `holdAction` is held, `0` the instant it's
 * released. Demonstrates that `AppliedTorqueEcsComponent.value` has to be
 * set every tick to sustain a spin, since `createAppliedTorqueEcsSystem`
 * resets it to `0` right after applying it each tick.
 */
export interface ThrusterEcsComponent {
  holdAction: HoldAction;
  torque: number;
}

export const thrusterId =
  createComponentId<ThrusterEcsComponent>('thruster');

export function addThrusterComponent(
  world: EcsWorld,
  entity: number,
  options: ThrusterEcsComponent,
): ThrusterEcsComponent {
  return world.addComponent(entity, thrusterId, { ...options });
}
