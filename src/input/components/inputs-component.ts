import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { InputManager } from '../input-manager.js';

/**
 * ECS-style component interface for inputs.
 */
export interface InputsEcsComponent {
  inputManager: InputManager;
}

export const inputsId = createComponentId<InputsEcsComponent>('inputs');

/**
 * Attaches a {@link InputsEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the inputs. `inputManager` has no
 * sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addInputsComponent(
  world: EcsWorld,
  entity: number,
  options: InputsEcsComponent,
): InputsEcsComponent {
  return world.addComponent(entity, inputsId, { ...options });
}
