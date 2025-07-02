import { PositionComponent } from '../../common';
import { Vector2 } from '../../math';
import {
  CameraComponent,
  CameraComponentOptions,
  CameraSystem,
} from '../../rendering';
import { Entity } from '../entity';
import { World } from '../world';

interface Inputs {
  world: World;
  inputsEntity: Entity;
}

export const registerCamera =
  (
    cameraOptions: Partial<CameraComponentOptions> = {},
    entityPosition: Vector2 = Vector2.zero,
    entityName: string = 'camera',
  ) =>
  <TInputs extends Inputs>(inputs: TInputs) => {
    const { world } = inputs;

    const cameraEntity = world.buildAndAddEntity(entityName, [
      new CameraComponent(cameraOptions),
      new PositionComponent(entityPosition.x, entityPosition.y),
    ]);

    world.addSystem(new CameraSystem(world.time));

    return {
      ...inputs,
      cameraEntity,
    };
  };
