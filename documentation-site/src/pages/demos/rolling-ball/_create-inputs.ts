import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
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
  const rollInput = new Axis1dAction('roll');
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
