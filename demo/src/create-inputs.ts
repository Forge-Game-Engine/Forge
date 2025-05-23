import * as forge from '../../src';

export const createInputs = (
  world: forge.World,
  gameContainer: HTMLElement,
  cameraEntity: forge.Entity,
  screenWidth: number,
  screenHeight: number,
) => {
  const inputsEntity = world.buildAndAddEntity('input', [
    new forge.InputsComponent(),
  ]);

  const inputSystem = new forge.InputSystem(
    gameContainer,
    cameraEntity,
    screenWidth,
    screenHeight,
  );

  world.addSystem(inputSystem);

  return inputsEntity;
};
