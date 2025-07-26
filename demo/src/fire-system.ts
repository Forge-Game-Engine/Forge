import {
  Entity,
  InputsComponent,
  System,
  TriggerAction,
} from '../../src';
import { HoldAction } from '../../src/input/actions/hold-action';

export class FireSystem extends System {
  constructor() {
    super('FireSystem', [InputsComponent.symbol]);
  }

  public run(entity: Entity) {
    const inputs = entity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );

    const fireAction = inputs.inputManager.getAction<TriggerAction>('fire');
    const runAction = inputs.inputManager.getAction<HoldAction>('run');

    if (fireAction?.isTriggered) {
      console.log(`Fire action triggered`);
    }

    if(runAction?.isHeld) {
      console.log(`Run action is being held`);
    }
  }
}
