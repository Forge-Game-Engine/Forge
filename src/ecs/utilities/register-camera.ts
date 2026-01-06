import {
  PositionComponentName,
  PositionEcsComponent,
  positionId,
  Time,
} from '../../common/index.js';
import { Vector2 } from '../../math/index.js';
import { EcsWorld } from '../../new-ecs/ecs-world.js';
import {
  CameraComponentName,
  CameraComponentOptions,
  CameraEcsComponent,
  cameraId,
  createCameraEcsSystem,
  defaultCameraOptions,
} from '../../rendering/index.js';

export const registerCamera = (
  world: EcsWorld,
  time: Time,
  cameraOptions: Partial<CameraComponentOptions> = {},
  entityPosition: Vector2 = Vector2.zero,
): void => {
  const cameraEntity = world.createEntity();

  const mergedCameraOptions = {
    ...defaultCameraOptions,
    ...cameraOptions,
  };

  world.addComponent(cameraEntity, cameraId, mergedCameraOptions);

  world.addComponent(cameraEntity, positionId, {
    world: entityPosition,
    local: Vector2.zero,
  });

  world.addSystem(createCameraEcsSystem(time));
};
