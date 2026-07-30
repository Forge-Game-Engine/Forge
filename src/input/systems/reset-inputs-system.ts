import { EcsSystem } from '../../ecs/ecs-system.js';
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
  update: (_world, { components: [inputsComponents] }) => {
    for (const inputsComponent of inputsComponents) {
      inputsComponent.inputManager.reset();
    }
  },
});
