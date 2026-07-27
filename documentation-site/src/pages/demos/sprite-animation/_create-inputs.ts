import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
  actionResetTypes,
  Axis1dAction,
  KeyboardAxis1dBinding,
  KeyboardInputSource,
  keyCodes,
  registerInputs,
} from '@forge-game-engine/forge/input';

export function createInputs(
  world: EcsWorld,
  time: Time,
): {
  moveInput: Axis1dAction;
} {
  // `noReset`, since the axis is driven by discrete keydown/keyup edges (see
  // KeyboardAxis1dBinding), not re-read every tick - the default `zero`
  // reset would zero it out again the instant after each keydown.
  const moveInput = new Axis1dAction('move', null, actionResetTypes.noReset);

  const inputManager = registerInputs(world, time, {
    axis1dActions: [moveInput],
  });

  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(moveInput, keyCodes.d, keyCodes.a),
  );

  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(
      moveInput,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );

  return { moveInput };
}
