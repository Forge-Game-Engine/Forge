import * as forge from '../../../../src';
import { StarComponent } from '../../star/components';
import { StarfieldComponent } from '../components';

export class StarfieldSystem extends forge.System {
  private _starPool: forge.ObjectPool;

  constructor(starPool: forge.ObjectPool) {
    super('starfield', [StarfieldComponent.symbol]);

    this._starPool = starPool;
  }

  public run(entity: forge.Entity): void {
    const starfieldComponent = entity.getComponentRequired<StarfieldComponent>(
      StarfieldComponent.symbol,
    );

    const numberOfStarsToSpawn =
      starfieldComponent.targetNumberOfStars - starfieldComponent.numberOfStars;

    for (let index = 0; index < numberOfStarsToSpawn; index++) {
      const star = this._starPool.getOrCreate();

      star.enabled = true;

      const starPositionComponent =
        star.getComponentRequired<forge.PositionComponent>(
          forge.PositionComponent.symbol,
        );

      const starComponent = star.getComponentRequired<StarComponent>(
        StarComponent.symbol,
      );

      starPositionComponent.x = 0;
      starPositionComponent.y = 0;

      starComponent.recalculateVelocity();

      starfieldComponent.numberOfStars++;
    }
  }
}
