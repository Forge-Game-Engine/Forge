import { Entity, System } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import { SpriteComponent } from '@forge-game-engine/forge/rendering';
import { BackgroundComponent } from './_background.component';

export class BackgroundSystem extends System {
  private readonly _time: Time;

  constructor(time: Time) {
    super([BackgroundComponent, SpriteComponent], 'BackgroundSystem');
    this._time = time;
  }

  public run(entity: Entity): void {
    const { sprite } = entity.getComponentRequired(SpriteComponent);

    sprite.renderable.material.setUniform('u_time', this._time.timeInSeconds);
  }
}
