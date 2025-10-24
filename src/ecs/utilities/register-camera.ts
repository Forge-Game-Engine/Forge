import { PositionComponent } from '../../common/index.js';
import { Vector2 } from '../../math/index.js';
import {
  CameraComponent,
  CameraComponentOptions,
  CameraSystem,
} from '../../rendering/index.js';
import type { Entity } from '../entity.js';
import { World } from '../world.js';

export const registerCamera = (
  world: World,
  cameraOptions: Partial<CameraComponentOptions> = {},
  entityPosition: Vector2 = Vector2.zero,
  entityName: string = 'camera',
): Entity => {
  const cameraEntity = world.buildAndAddEntity(entityName, [
    new CameraComponent(cameraOptions),
    new PositionComponent(entityPosition.x, entityPosition.y),
  ]);

  world.addSystem(new CameraSystem(world.time));

  return cameraEntity;
};
