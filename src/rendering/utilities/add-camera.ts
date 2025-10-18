import { PositionComponent } from 'forge/common';
import type { Entity, World } from 'forge/ecs';
import { CameraComponent, type CameraComponentOptions } from 'forge/rendering/components';
import { CameraSystem } from 'forge/rendering/systems';

/**
 * Adds a camera entity to the world with the specified options.
 * @param world - The world to which the camera will be added.
 * @param cameraOptions - Options for configuring the camera.
 * @returns The entity that contains the `CameraComponent`.
 */
export function addCamera(
  world: World,
  cameraOptions: Partial<CameraComponentOptions>,
): Entity {
  const cameraEntity = world.buildAndAddEntity('camera', [
    new CameraComponent(cameraOptions),
    new PositionComponent(0, 0),
  ]);

  world.addSystem(new CameraSystem(world.time));

  return cameraEntity;
}
