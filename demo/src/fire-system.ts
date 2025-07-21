import {
  Axis1dAction,
  Entity,
  InputsComponent,
  System,
  TriggerAction,
} from '../../src';

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

    if (fireAction?.isTriggered) {
      console.log(`Fire action triggered`);
    }

    console.log(`Zoom action value: ${zoomAction?.value}`);
    console.log(`Pan action value: ${panAction?.value}`);
  }
}
