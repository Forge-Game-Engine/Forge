import * as forge from '../../src';

export const createCameras = (
  world: forge.World,
  worldSpace: forge.Space,
  inputsEntity: forge.Entity,
  game: forge.Game,
) => {
  const worldCamera = world.buildAndAddEntity('World Camera', [
    new forge.CameraComponent(),
    new forge.PositionComponent(worldSpace.center.x, worldSpace.center.y),
  ]);

  const cameraSystem = new forge.CameraSystem(inputsEntity, game.time);

  world.addSystem(cameraSystem);

  return worldCamera;
};
