import { type World } from '../../ecs';
import { InputsComponent } from '../components';
import { InputSystem } from '../systems';

/**
 * Adds an `InputsComponent` to the world and initializes the input system.
 * @param world - The world to which the inputs component will be added.
 * @returns The entity that contains the `InputsComponent`.
 */
export function addInputs(world: World) {
  const inputsEntity = world.buildAndAddEntity('inputs', [
    new InputsComponent(),
  ]);

  const inputSystem = new InputSystem();

  world.addSystem(inputSystem);

  return inputsEntity;
}
