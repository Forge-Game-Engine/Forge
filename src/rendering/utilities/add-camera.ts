import { PositionComponent, Time } from '../../common';
import { Entity, World } from '../../ecs';
import { CameraComponent, type CameraComponentOptions } from '../components';
import { CameraSystem } from '../systems';

/**
 * Adds a camera entity to the world with the specified options.
 * @param world - The world to which the camera will be added.
 * @param inputsEntity - The entity that contains the `InputsComponent`.
 * @param time - The `Time` instance.
 * @param cameraOptions - Options for configuring the camera.
 * @returns The entity that contains the `CameraComponent`.
 */
export function addCamera(
  world: World,
  inputsEntity: Entity,
  time: Time,
  cameraOptions: Partial<CameraComponentOptions>,
) {
  const cameraEntity = world.buildAndAddEntity('camera', [
    new CameraComponent(cameraOptions),
    new PositionComponent(0, 0),
  ]);

  world.addSystem(new CameraSystem(inputsEntity, time));

  return cameraEntity;
}
