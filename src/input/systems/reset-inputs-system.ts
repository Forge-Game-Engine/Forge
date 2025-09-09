import { Entity, System } from '../../ecs';
import { InputsComponent } from '../components';

export class ResetInputSystem extends System {
  constructor() {
    super('input', [InputsComponent.symbol]);
  }

  public run(entity: Entity): void {
    const inputsComponent = entity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );

    inputsComponent.inputManager.reset();
  }
}
