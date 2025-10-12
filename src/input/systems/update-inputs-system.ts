import { Entity, System, World } from '../../ecs';
import { InputsComponent } from '../components';

/** A system that updates all input states each frame. */
export class UpdateInputSystem extends System {
  private readonly _world: World;

  /** Constructs a new UpdateInputSystem. */
  constructor(world: World) {
    super(Symbol('input'), [InputsComponent.symbol]);
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
