import * as forge from '../../src';

export const createInputs = (
  world: forge.World,
  gameContainer: HTMLElement,
  cameraEntity: forge.Entity,
  screenWidth: number,
  screenHeight: number,
) => {
  const inputsEntity = new forge.Entity('input', [new forge.InputsComponent()]);

  const inputSystem = new forge.InputSystem(
    gameContainer,
    cameraEntity,
    screenWidth,
    screenHeight,
  );

  world.addEntity(inputsEntity);
  world.addSystem(inputSystem);

  return inputsEntity;
};
