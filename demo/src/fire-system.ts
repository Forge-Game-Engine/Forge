import {
  Axis1dAction,
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
    const zoomAction = inputs.inputManager.getAction<Axis1dAction>('zoom');
    const panAction = inputs.inputManager.getAction<Axis1dAction>('pan');
    const runAction = inputs.inputManager.getAction<HoldAction>('run');

    if (fireAction?.isTriggered) {
      console.log(`Fire action triggered`);
    }
    if(runAction?.isHeld) {
      console.log(`Run action is being held`);
    }

    // console.log(`Zoom action value: ${zoomAction?.value}`);
    // console.log(`Pan action value: ${panAction?.value}`);
  }
}
