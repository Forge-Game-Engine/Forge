import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  InputsEcsComponent,
  inputsId,
} from '../components/inputs-component.js';

/**
 * Creates an ECS system to handle updating inputs.
 */
export const createUpdateInputEcsSystem = (
  time: Time,
): EcsSystem<[InputsEcsComponent]> => ({
  query: [inputsId],
  update: (_world, { components: [inputsComponents] }) => {
    for (const inputsComponent of inputsComponents) {
      inputsComponent.inputManager.update(time.deltaTimeInMilliseconds);
    }
  },
});
