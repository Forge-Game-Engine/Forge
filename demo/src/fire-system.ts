import { Entity, InputsComponent, System, TriggerAction } from '../../src';

export class FireSystem extends System {
  constructor() {
    super('FireSystem', [InputsComponent.symbol]);
  }

  public run(entity: Entity) {
    const inputs = entity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );

    const fireAction = inputs.inputManager.getAction<TriggerAction>('fire');

    if (fireAction.isTriggered) {
      console.log(`Fire action triggered`);
    }
  }
}
