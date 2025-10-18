import { PositionComponent } from '../../common';
import { Vector2 } from '../../math';
import {
  CameraComponent,
  CameraComponentOptions,
  CameraSystem,
} from '../../rendering';
import type { Entity } from '../entity';
import { World } from '../world';

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
