import { PositionComponent, Time } from '../../common/index.js';
import { Vector2 } from '../../math/index.js';
import {
  CameraComponent,
  CameraComponentOptions,
  CameraSystem,
} from '../../rendering/index.js';
import type { Entity } from '../entity.js';
import { World } from '../world.js';

/**
 * Registers a camera entity to the world with the specified options.
 *
 * @param world - The world to which the camera entity will be registered.
 * @param time - The Time instance for managing time-related operations.
 * @param cameraOptions - Options for configuring the camera component.
 * @param entityPosition - The initial position of the camera entity. Defaults to Vector2.zero.
 * @param entityName - The name of the camera entity. Defaults to 'camera'.
 * @returns The created camera entity.
 */
export const registerCamera = (
  world: World,
  time: Time,
  cameraOptions: Partial<CameraComponentOptions> = {},
  entityPosition: Vector2 = Vector2.zero,
  entityName: string = 'camera',
): Entity => {
  const cameraEntity = world.buildAndAddEntity(
    [
      new CameraComponent(cameraOptions),
      new PositionComponent(entityPosition.x, entityPosition.y),
    ],
    { name: entityName },
  );

  world.addSystem(new CameraSystem(time));

  return cameraEntity;
};
