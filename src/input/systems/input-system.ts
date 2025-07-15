import { Resettable } from '../../common';
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

    this._resetAll(inputsComponent.inputGroup.sources);
    this._resetAll(inputsComponent.inputGroup.actions);
    this._resetAll(inputsComponent.inputGroup.axis1ds);
    this._resetAll(inputsComponent.inputGroup.axis2ds);
  }

  private _resetAll(resettables: Map<string, Resettable>): void;
  private _resetAll(resettables: Iterable<Resettable>): void;
  private _resetAll(
    resettables: Map<string, Resettable> | Iterable<Resettable>,
  ): void {
    if (resettables instanceof Map) {
      for (const resettable of resettables.values()) {
        resettable.reset();
      }

      return;
    }

    for (const resettable of resettables) {
      resettable.reset();
    }
  }
}
