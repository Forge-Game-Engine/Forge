import { type World } from '../../ecs';
import { InputsComponent } from '../components';
import { InputManager } from '../input-manager';
import { InputSystem } from '../systems';

/**
 * Adds an `InputsComponent` to the world and initializes the input system.
 * @param world - The world to which the inputs component will be added.
 * @returns The entity that contains the `InputsComponent`.
 */
export function addInputs(world: World) {
  const inputManager = new InputManager();

  const inputsEntity = world.buildAndAddEntity('inputs', [
    new InputsComponent(inputManager),
  ]);

  const inputSystem = new InputSystem();

  world.addSystem(inputSystem);

  return inputsEntity;
}
