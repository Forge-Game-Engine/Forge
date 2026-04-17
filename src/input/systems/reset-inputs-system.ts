import { EcsSystem } from '../../new-ecs/ecs-system.js';
import {
  InputsEcsComponent,
  inputsId,
} from '../components/inputs-component.js';

/**
 * Creates an ECS system to handle resetting inputs.
 */
export const createResetInputsEcsSystem = (): EcsSystem<
  [InputsEcsComponent]
> => ({
  query: [inputsId],
  run: (result) => {
    const [inputsComponent] = result.components;
    inputsComponent.inputManager.reset();
  },
});
