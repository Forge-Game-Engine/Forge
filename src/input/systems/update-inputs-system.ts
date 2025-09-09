import { Entity, System, World } from '../../ecs';
import { InputsComponent } from '../components';

export class UpdateInputSystem extends System {
  private readonly _world: World;

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
