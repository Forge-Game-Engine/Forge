import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';

/**
 * Resizes this entity's (nine-sliced) sprite into a vertical line between a
 * fixed anchor point and `entity`'s current position every tick, visualizing
 * a linear spring/damper pair's current length. Demo-only: the engine has
 * no built-in "line between two points" primitive.
 */
export interface SpringLineEcsComponent {
  anchorPosition: Vector2;
  entity: number;
  lineWidth: number;
}

export const springLineId =
  createComponentId<SpringLineEcsComponent>('springLine');

export function addSpringLineComponent(
  world: EcsWorld,
  entity: number,
  options: SpringLineEcsComponent,
): SpringLineEcsComponent {
  return world.addComponent(entity, springLineId, { ...options });
}
