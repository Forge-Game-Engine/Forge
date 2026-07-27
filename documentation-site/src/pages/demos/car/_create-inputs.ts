import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
  actionResetTypes,
  Axis1dAction,
  buttonMoments,
  KeyboardAxis1dBinding,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  keyCodes,
  registerInputs,
  TriggerAction,
} from '@forge-game-engine/forge/input';

export function createInputs(
  world: EcsWorld,
  time: Time,
): {
  throttleInput: Axis1dAction;
  restartInput: TriggerAction;
} {
  // `noReset` so the throttle keeps its value between ticks instead of
  // snapping back to zero every frame the way a one-shot action would; the
  // keyboard binding itself sets it back to zero on key-up.
  const throttleInput = new Axis1dAction(
    'throttle',
    undefined,
    actionResetTypes.noReset,
  );
  const restartInput = new TriggerAction('restart');

  const inputManager = registerInputs(world, time, {
    axis1dActions: [throttleInput],
    triggerActions: [restartInput],
  });

  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(
      throttleInput,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );

  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(throttleInput, keyCodes.d, keyCodes.a),
  );

  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(restartInput, keyCodes.r, buttonMoments.down),
  );

  return { throttleInput, restartInput };
}
