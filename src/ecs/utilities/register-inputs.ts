import { Time } from '../../common/index.js';
import {
  Axis1dAction,
  Axis2dAction,
  HoldAction,
  InputsComponent,
  ResetInputSystem,
  TriggerAction,
  UpdateInputSystem,
} from '../../input/index.js';
import { InputManager } from '../../input/input-manager.js';
import { systemRegistrationPositions } from '../constants/index.js';
import type { Entity } from '../entity.js';
import { World } from '../world.js';

/**
 * Registers an inputs entity and input systems to the world.
 *
 * @param world - The world to which the inputs will be registered.
 * @param time - The Time instance for managing time-related operations.
 * @param options - Configuration options for the inputs.
 * @param options.entityName - The name of the inputs entity. Defaults to 'inputs'.
 * @param options.triggerActions - Array of trigger actions to register.
 * @param options.axis1dActions - Array of 1D axis actions to register.
 * @param options.axis2dActions - Array of 2D axis actions to register.
 * @param options.holdActions - Array of hold actions to register.
 * @returns An object containing the created inputs entity and the input manager.
 */
export const registerInputs = (
  world: World,
  time: Time,
  options: {
    entityName?: string;
    triggerActions?: TriggerAction[];
    axis1dActions?: Axis1dAction[];
    axis2dActions?: Axis2dAction[];
    holdActions?: HoldAction[];
  } = {},
): {
  inputsEntity: Entity;
  inputsManager: InputManager;
} => {
  const inputsManager = new InputManager();
  const inputsComponent = new InputsComponent(inputsManager);

  const {
    entityName = 'inputs',
    triggerActions = [],
    axis1dActions = [],
    axis2dActions = [],
    holdActions = [],
  } = options;

  const inputsEntity = world.buildAndAddEntity([inputsComponent], {
    name: entityName,
  });

  inputsManager.addTriggerActions(...triggerActions);
  inputsManager.addAxis1dActions(...axis1dActions);
  inputsManager.addAxis2dActions(...axis2dActions);
  inputsManager.addHoldActions(...holdActions);

  world.addSystem(
    new UpdateInputSystem(time),
    systemRegistrationPositions.early,
  );
  world.addSystem(new ResetInputSystem(), systemRegistrationPositions.late);

  return {
    inputsEntity,
    inputsManager,
  };
};
