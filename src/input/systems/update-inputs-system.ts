import { Time } from '../../common';
import { EcsSystem } from '../../new-ecs/ecs-system.js';
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
  run: (result) => {
    const [inputsComponent] = result.components;
    inputsComponent.inputManager.update(time.deltaTimeInMilliseconds);
  },
});
