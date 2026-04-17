import { Time } from '../common/index.js';
import { EcsWorld, SystemRegistrationOrder } from '../new-ecs/index.js';
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
