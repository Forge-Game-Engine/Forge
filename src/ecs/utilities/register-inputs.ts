import { InputsComponent, InputSystem } from '../../input';
import { systemRegistrationPositions } from '../constants';
import { World } from '../world';

interface Inputs {
  world: World;
}

export const registerInputs =
  (entityName: string = 'inputs') =>
  <TInputs extends Inputs>(inputs: TInputs) => {
    const { world } = inputs;

    const inputsComponent = new InputsComponent();

    const inputsEntity = world.buildAndAddEntity(entityName, [inputsComponent]);

    world.addSystem(new InputSystem(), systemRegistrationPositions.late);

    return {
      ...inputs,
      inputsEntity,
    };
  };
