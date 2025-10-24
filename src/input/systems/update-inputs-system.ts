import { Entity, System, World } from '../../ecs/index.js';
import { InputsComponent } from '../components/index.js';

/** A system that updates all input states each frame. */
export class UpdateInputSystem extends System {
  private readonly _world: World;

  /** Constructs a new UpdateInputSystem. */
  constructor(world: World) {
    super('input', [InputsComponent.symbol]);
    this._world = world;
  }

  public run(entity: Entity): void {
    const inputsComponent = entity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );

    inputsComponent.inputManager.update(
      this._world.time.deltaTimeInMilliseconds,
    );
  }
}
