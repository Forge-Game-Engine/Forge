import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';

/** Moves a camera along X to follow an entity, inside a range. */
export interface CameraFollowEcsComponent {
  /** The entity the camera follows. */
  target: number;

  /** The left edge the camera's view stops at, in world units. */
  minX: number;

  /** The right edge the camera's view stops at, in world units. */
  maxX: number;
}

export const cameraFollowId =
  createComponentId<CameraFollowEcsComponent>('camera-follow');

/**
 * Makes a camera follow an entity.
 * @param world - The world the camera belongs to.
 * @param camera - The camera's entity.
 * @param follow - The entity to follow, and the edges the view stops at.
 * @returns The added component.
 */
export function addCameraFollowComponent(
  world: EcsWorld,
  camera: number,
  follow: CameraFollowEcsComponent,
): CameraFollowEcsComponent {
  world.addComponent(camera, cameraFollowId, follow);

  return follow;
}
