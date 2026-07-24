import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { RigidBody } from '@forge-game-engine/forge/physics';

/**
 * Stretches and rotates this entity's sprite into a line between a fixed
 * pivot point and `body`'s current position every tick, visualizing the arm
 * a `RevoluteJoint` swings a ball on. Demo-only: the engine has no built-in
 * "line between two points" primitive.
 */
export interface ArmLineEcsComponent {
  pivotPosition: Vector2;
  body: RigidBody;
  lineWidth: number;
}

export const armLineId = createComponentId<ArmLineEcsComponent>('armLine');

export function addArmLineComponent(
  world: EcsWorld,
  entity: number,
  options: ArmLineEcsComponent,
): ArmLineEcsComponent {
  return world.addComponent(entity, armLineId, { ...options });
}
