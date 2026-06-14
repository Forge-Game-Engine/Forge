import { Time } from '../common/index.js';
import { EcsWorld, SystemRegistrationOrder } from '../ecs/index.js';
import {
  Axis1dAction,
  Axis2dAction,
  HoldAction,
  TriggerAction,
} from './actions/index.js';
import { inputsId } from './components/index.js';
import { InputManager } from './input-manager.js';
import {
  createResetInputsEcsSystem,
  createUpdateInputEcsSystem,
} from './systems/index.js';

/**
 * Creates an InputManager, registers it on a new entity in the world, and
 * adds the update and reset systems that drive it each frame.
 * @param world - The world to register the input entity and systems with.
 * @param time - The Time instance used to advance the InputManager each frame.
 * @param options - Actions to register with the InputManager up front.
 * @param options.triggerActions - Trigger actions to add to the InputManager.
 * @param options.axis1dActions - 1D axis actions to add to the InputManager.
 * @param options.axis2dActions - 2D axis actions to add to the InputManager.
 * @param options.holdActions - Hold actions to add to the InputManager.
 * @returns The InputManager, for creating input sources and bindings against.
 */
export const registerInputs = (
  world: EcsWorld,
  time: Time,
  options: {
    triggerActions?: TriggerAction[];
    axis1dActions?: Axis1dAction[];
    axis2dActions?: Axis2dAction[];
    holdActions?: HoldAction[];
  } = {},
): InputManager => {
  const inputManager = new InputManager();

  const {
    triggerActions = [],
    axis1dActions = [],
    axis2dActions = [],
    holdActions = [],
  } = options;

  const inputsEntity = world.createEntity();

  world.addComponent(inputsEntity, inputsId, {
    inputManager,
  });

  inputManager.addTriggerActions(...triggerActions);
  inputManager.addAxis1dActions(...axis1dActions);
  inputManager.addAxis2dActions(...axis2dActions);
  inputManager.addHoldActions(...holdActions);

  world.addSystem(
    createUpdateInputEcsSystem(time),
    SystemRegistrationOrder.early,
  );
  world.addSystem(createResetInputsEcsSystem(), SystemRegistrationOrder.late);

  return inputManager;
};
