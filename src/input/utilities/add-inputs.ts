import { Entity, type World } from '../../ecs';
import { InputsComponent } from '../components';
import { InputSystem } from '../systems';

/**
 * Adds an `InputsComponent` to the world and initializes the input system.
 * @param world - The world to which the inputs component will be added.
 * @param container - The HTML element that will receive input events.
 * @returns The entity that contains the `InputsComponent`.
 */
export function addInputs(world: World, container: HTMLElement) {
  const inputsEntity = new Entity('inputs', [new InputsComponent()]);

  const inputSystem = new InputSystem(container);

  world.addEntity(inputsEntity);
  world.addSystem(inputSystem);

  return inputsEntity;
}
