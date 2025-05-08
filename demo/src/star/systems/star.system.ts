import * as forge from '../../../../src';
import { StarComponent } from '../components';

export class StarSystem extends forge.System {
  private _pool: forge.ObjectPool;

  constructor(pool: forge.ObjectPool) {
    super('star', [StarComponent.symbol, forge.PositionComponent.symbol]);
    this._pool = pool;
  }

  public async run(entity: forge.Entity): Promise<void> {
    const starComponent = entity.getComponentRequired<StarComponent>(
      StarComponent.symbol,
    );

    const positionComponent =
      entity.getComponentRequired<forge.PositionComponent>(
        forge.PositionComponent.symbol,
      );

    positionComponent.x += starComponent.velocity.x;
    positionComponent.y += starComponent.velocity.y;

    if (positionComponent.magnitudeSquared() > MAX_POSITION_MAGNITUDE_SQUARED) {
      this._pool.release(entity);
    }
  }
}
