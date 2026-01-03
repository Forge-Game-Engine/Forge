import { Game, registerInputs, World } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
  actionResetTypes,
  Axis2dAction,
  HoldAction,
  KeyboardAxis2dBinding,
  KeyboardHoldBinding,
  KeyboardInputSource,
  keyCodes,
  mouseButtons,
  MouseHoldBinding,
  MouseInputSource,
} from '@forge-game-engine/forge/input';

export function createInputs(
  world: World,
  time: Time,
  game: Game,
): {
  moveInput: Axis2dAction;
  shootInput: HoldAction;
} {
  const moveInput = new Axis2dAction('move', null, actionResetTypes.noReset);
  const shootInput = new HoldAction('shoot');

  const { inputsManager } = registerInputs(world, time, {
    axis2dActions: [moveInput],
    holdActions: [shootInput],
  });

  const keyboardInputSource = new KeyboardInputSource(inputsManager);
  const mouseInputSource = new MouseInputSource(inputsManager, game);

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

  keyboardInputSource.holdBindings.add(
    new KeyboardHoldBinding(shootInput, keyCodes.space),
  );

  mouseInputSource.holdBindings.add(
    new MouseHoldBinding(shootInput, mouseButtons.left),
  );

  return { moveInput, shootInput };
}
