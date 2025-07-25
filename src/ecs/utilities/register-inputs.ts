import { InputsComponent, InputSystem } from '../../input';
import { InputManager } from '../../input/input-manager';
import { systemRegistrationPositions } from '../constants';
import { World } from '../world';

export const registerInputs = (world: World, entityName: string = 'inputs') => {
  const inputsManager = new InputManager();
  const inputsComponent = new InputsComponent(inputsManager);

  const inputsEntity = world.buildAndAddEntity(entityName, [inputsComponent]);

  world.addSystem(new InputSystem(), systemRegistrationPositions.late);

  return {
    inputsEntity,
    inputsManager,
  };
};
