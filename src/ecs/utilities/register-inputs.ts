import {
  Axis1dAction,
  Axis2dAction,
  HoldAction,
  InputsComponent,
  ResetInputSystem,
  TriggerAction,
  UpdateInputSystem,
} from '../../input';
import { InputManager } from '../../input/input-manager';
import { systemRegistrationPositions } from '../constants';
import { Entity } from '../entity';
import { World } from '../world';

export const registerInputs = (
  world: World,
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
    entityName,
    triggerActions = [],
    axis1dActions = [],
    axis2dActions = [],
    holdActions = [],
  } = options;

  const inputsEntity = world.buildAndAddEntity(entityName ?? 'inputs', [
    inputsComponent,
  ]);

  inputsManager.addTriggerActions(...triggerActions);
  inputsManager.addAxis1dActions(...axis1dActions);
  inputsManager.addAxis2dActions(...axis2dActions);
  inputsManager.addHoldActions(...holdActions);

  world.addSystem(
    new UpdateInputSystem(world),
    systemRegistrationPositions.early,
  );
  world.addSystem(new ResetInputSystem(), systemRegistrationPositions.late);

  return {
    inputsEntity,
    inputsManager,
  };
};
