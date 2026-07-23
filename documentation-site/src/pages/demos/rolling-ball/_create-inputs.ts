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
  rollInput: Axis1dAction;
  jumpInput: TriggerAction;
} {
  // `noReset`, since the axis is driven by discrete keydown/keyup edges
  // (see KeyboardAxis1dBinding), not re-read every tick - the default
  // `zero` reset would zero it out again the instant after each keydown.
  const rollInput = new Axis1dAction('roll', null, actionResetTypes.noReset);
  const jumpInput = new TriggerAction('jump');

  const inputManager = registerInputs(world, time, {
    axis1dActions: [rollInput],
    triggerActions: [jumpInput],
  });

  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(rollInput, keyCodes.d, keyCodes.a),
  );

  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(
      rollInput,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );

  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(jumpInput, keyCodes.space, buttonMoments.down),
  );

  return { rollInput, jumpInput };
}
