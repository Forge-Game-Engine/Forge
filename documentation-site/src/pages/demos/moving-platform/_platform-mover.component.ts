import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';

/**
 * Drives a kinematic platform back and forth along the X axis between
 * `leftX` and `rightX`: since a kinematic body's velocity is meant to be
 * set directly by game code (it's never touched by gravity or impulses),
 * this is the entity's own "AI" for reversing direction once it reaches
 * either bound.
 */
export interface PlatformMoverEcsComponent {
  leftX: number;
  rightX: number;
  speed: number;
}

export const platformMoverId =
  createComponentId<PlatformMoverEcsComponent>('platform-mover');

export function addPlatformMoverComponent(
  world: EcsWorld,
  entity: number,
  options: PlatformMoverEcsComponent,
): PlatformMoverEcsComponent {
  return world.addComponent(entity, platformMoverId, options);
}
