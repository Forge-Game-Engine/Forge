import { Entity, System } from '../../ecs';
import { InputsComponent } from '../components';

export class InputSystem extends System {
  constructor() {
    super('input', [InputsComponent.symbol]);
  }

  public run(entity: Entity): void {
    const inputsComponent = entity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );

    for (const inputSource of inputsComponent.inputSources) {
      inputSource.reset();
    }
  }
}
