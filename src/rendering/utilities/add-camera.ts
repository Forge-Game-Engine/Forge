import { PositionComponent, Time } from '../../common';
import { Entity, World } from '../../ecs';
import { CameraComponent, type CameraComponentOptions } from '../components';
import { CameraSystem } from '../systems';

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
