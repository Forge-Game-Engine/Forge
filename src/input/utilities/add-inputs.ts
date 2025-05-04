import { Entity, type World } from '../../ecs';
import { InputsComponent } from '../components';
import { InputSystem } from '../systems';

/**
 * Adds an `InputsComponent` to the world and initializes the input system.
 * @param world - The world to which the inputs component will be added.
 * @param container - The HTML element that will receive input events.
 * @param cameraEntity - The entity representing the camera.
 * @param screenWidth - The width of the screen.
 * @param screenHeight - The height of the screen.
 * @returns The entity that contains the `InputsComponent`.
 */
export function addInputs(
  world: World,
  container: HTMLElement,
  cameraEntity: Entity,
  screenWidth: number,
  screenHeight: number,
) {
  const inputsEntity = new Entity('inputs', [new InputsComponent()]);

  const inputSystem = new InputSystem(
    container,
    cameraEntity,
    screenWidth,
    screenHeight,
  );

  world.addEntity(inputsEntity);
  world.addSystem(inputSystem);

  return inputsEntity;
}
