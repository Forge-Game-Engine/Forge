import { HoldAction, InputsEcsComponent, inputsId, TriggerAction } from '../../src';
import { EcsSystem } from '../../src/new-ecs';

export const createFireEcsSystem = (
  fireAction: TriggerAction,
  runAction: HoldAction,
): EcsSystem<[InputsEcsComponent]> => ({
  query: [inputsId],
  run: () => {
    if (fireAction.isTriggered) {
      console.log(`Fire action triggered`);
    }

    if (runAction.isHeld) {
      console.log(`Run action is being held`);
    }
  },
});
