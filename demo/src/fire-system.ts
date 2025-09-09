import { Entity, InputsComponent, System } from '../../src';

export class FireSystem extends System {
  constructor() {
    super('FireSystem', [InputsComponent.symbol]);
  }

  public run(entity: Entity) {
    const inputs = entity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );

    const fireAction = inputs.inputManager.getTriggerAction('fire');
    const runAction = inputs.inputManager.getHoldAction('run');
    const zoomAction = inputs.inputManager.getAxis1dAction('zoom');

    if (fireAction?.isTriggered) {
      console.log(`Fire action triggered`);
    }

    if (runAction?.isHeld) {
      console.log(`Run action is being held`);
    }

    console.log(`Axis action value: ${zoomAction?.value}`);
  }
}
