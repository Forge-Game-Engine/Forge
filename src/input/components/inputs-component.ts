import { createComponentId } from '../../new-ecs/ecs-component.js';
import { InputManager } from '../input-manager.js';

/**
 * ECS-style component interface for inputs.
 */
export interface InputsEcsComponent {
  inputManager: InputManager;
}

export const inputsId = createComponentId<InputsEcsComponent>('inputs');
