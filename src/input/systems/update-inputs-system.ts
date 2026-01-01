import { Entity, System } from '../../ecs/index.js';
import { Time } from '../../index.js';
import { InputsComponent } from '../components/index.js';

/** A system that updates all input states each frame. */
export class UpdateInputSystem extends System {
  private readonly _time: Time;

  /** Constructs a new UpdateInputSystem. */
  constructor(time: Time) {
    super([InputsComponent], 'update-input');
    this._time = time;
  }

  public run(entity: Entity): void {
    const inputsComponent = entity.getComponentRequired(InputsComponent);

    inputsComponent.inputManager.update(this._time.deltaTimeInMilliseconds);
  }
}
