import {
  Axis1dAction,
  Axis2dAction,
  InputsComponent,
  ResetInputSystem,
  TriggerAction,
  UpdateInputSystem,
} from '../../input';
import { InputManager } from '../../input/input-manager';
import { systemRegistrationPositions } from '../constants';
import { World } from '../world';

export const registerInputs = (
  world: World,
  options: {
    entityName?: string;
    triggerActions?: TriggerAction[];
    axis1dActions?: Axis1dAction[];
    axis2dActions?: Axis2dAction[];
  } = {},
) => {
  const inputsManager = new InputManager();
  const inputsComponent = new InputsComponent(inputsManager);

  const {
    entityName,
    triggerActions = [],
    axis1dActions = [],
    axis2dActions = [],
  } = options;

  const inputsEntity = world.buildAndAddEntity(entityName ?? 'inputs', [
    inputsComponent,
  ]);

  inputsManager.addResettable(...triggerActions);
  inputsManager.addResettable(...axis1dActions);
  inputsManager.addResettable(...axis2dActions);

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
