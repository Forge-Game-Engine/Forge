import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { RigidBody } from '@forge-game-engine/forge/physics';

/**
 * Stretches this entity's sprite into a vertical line between a fixed
 * anchor point and `body`'s current position every tick, visualizing a
 * LinearSpring/LinearDamper pair's current length. Demo-only: the engine
 * has no built-in "line between two points" primitive.
 */
export interface SpringLineEcsComponent {
  anchorPosition: Vector2;
  body: RigidBody;
  lineWidth: number;
  spriteWidth: number;
  spriteHeight: number;
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
