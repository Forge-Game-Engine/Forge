import { Entity, System } from '@forge-game-engine/forge/ecs';
import { PositionComponent, Time } from '@forge-game-engine/forge/common';
import { BulletComponent } from './_bullet.component';

export class BulletSystem extends System {
  private readonly _time: Time;

  constructor(time: Time) {
    super([BulletComponent, PositionComponent], 'BulletSystem');
    this._time = time;
  }

  public run(entity: Entity): void {
    const bulletComponent = entity.getComponentRequired(BulletComponent);
    const positionComponent = entity.getComponentRequired(PositionComponent);

    positionComponent.world.y +=
      -bulletComponent.speed * this._time.deltaTimeInSeconds;
  }
}
