import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
  actionResetTypes,
  Axis2dAction,
  KeyboardAxis2dBinding,
  KeyboardInputSource,
  keyCodes,
  registerInputs,
} from '@forge-game-engine/forge/input';

export function createInputs(world: EcsWorld, time: Time): Axis2dAction {
  const moveInput = new Axis2dAction('move', null, actionResetTypes.noReset);

  const inputManager = registerInputs(world, time, {
    axis2dActions: [moveInput],
  });

  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.axis2dBindings.add(
    new KeyboardAxis2dBinding(
      moveInput,
      keyCodes.w,
      keyCodes.s,
      keyCodes.d,
      keyCodes.a,
    ),
  );

  keyboardInputSource.axis2dBindings.add(
    new KeyboardAxis2dBinding(
      moveInput,
      keyCodes.arrowUp,
      keyCodes.arrowDown,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );

  return moveInput;
}
