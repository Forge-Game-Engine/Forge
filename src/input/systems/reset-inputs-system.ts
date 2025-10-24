import { Entity, System } from '../../ecs/index.js';
import { InputsComponent } from '../components/index.js';

/** A system that resets all input states at the end of each frame. */
export class ResetInputSystem extends System {
  /** Constructs a new ResetInputSystem. */
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
