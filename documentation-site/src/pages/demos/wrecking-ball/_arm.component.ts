import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';

/**
 * Repositions, resizes, and rotates this entity's (nine-sliced) sprite
 * every tick to span the rigid rod between a fixed pivot point and `entity`'s
 * current position, visualizing a revolute joint's otherwise-invisible arm.
 * Demo-only: the engine has no built-in "line between two points" primitive.
 */
export interface ArmEcsComponent {
  pivotPosition: Vector2;
  entity: number;
  armWidth: number;
}

export const armId = createComponentId<ArmEcsComponent>('arm');

export function addArmComponent(
  world: EcsWorld,
  entity: number,
  options: ArmEcsComponent,
): ArmEcsComponent {
  return world.addComponent(entity, armId, { ...options });
}
