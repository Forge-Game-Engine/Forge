import { Entity, InputsComponent, System } from '../../src';

export class FireSystem extends System {
  constructor() {
    super('FireSystem', [InputsComponent.symbol]);
  }

  public run(entity: Entity) {
    const inputs = entity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );

    if (inputs.inputActions.get('fire')?.fired) {
      console.log('Fire action triggered!');
    }
  }
}
