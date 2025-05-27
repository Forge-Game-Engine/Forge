import * as forge from '../../../../src';
import { StarComponent } from '../components';

export class StarSystem extends forge.System {
  private _pool: forge.ObjectPool;

  constructor(pool: forge.ObjectPool) {
    super('star', [StarComponent.symbol, forge.PositionComponent.symbol]);
    this._pool = pool;
  }

  public run(entity: forge.Entity): void {
    const starComponent = entity.getComponentRequired<StarComponent>(
      StarComponent.symbol,
    );

    const positionComponent =
      entity.getComponentRequired<forge.PositionComponent>(
        forge.PositionComponent.symbol,
      );

    positionComponent.x += starComponent.velocity.x;
    positionComponent.y += starComponent.velocity.y;

    const maxPositionMagnitudeSquared = 1500 * 1500;

    if (positionComponent.magnitudeSquared() > maxPositionMagnitudeSquared) {
      this._pool.release(entity);
    }
  }
}
