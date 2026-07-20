import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { HoldAction } from '@forge-game-engine/forge/input';

/**
 * Marks an entity as a player-controlled thruster: `createThrusterEcsSystem`
 * queries for this alongside the entity's `PhysicsBodyEcsComponent` and
 * calls `RigidBody.applyTorque` directly while `holdAction` is held. There's
 * no engine-provided "apply this torque" component for this, since real game
 * code almost always already has its own component identifying which
 * entities get torque and why (a thruster, a motor, a spell effect, ...) -
 * this component plays that role for the demo.
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
