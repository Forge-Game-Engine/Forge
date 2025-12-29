import { Entity, System } from '@forge-game-engine/forge/ecs';
import { PositionComponent, Time } from '@forge-game-engine/forge/common';
import { clamp } from '@forge-game-engine/forge/math';
import { Axis2dAction } from '@forge-game-engine/forge/input';
import { PlayerComponent } from './player.component';

export class MovementSystem extends System {
  private readonly _moveAction: Axis2dAction;
  private readonly _time: Time;

  constructor(moveAction: Axis2dAction, time: Time) {
    super([PlayerComponent, PositionComponent], 'MovementSystem');
    this._moveAction = moveAction;
    this._time = time;
  }

  public run(entity: Entity): void {
    const { speed, minX, maxX, minY, maxY } =
      entity.getComponentRequired(PlayerComponent);

    const playerPosition = entity.getComponentRequired(PositionComponent);

    const movementVector = this._moveAction.value
      .normalize()
      .multiply(speed * 10)
      .multiply(this._time.deltaTimeInSeconds);

    playerPosition.world.x = clamp(
      playerPosition.world.x + movementVector.x,
      minX,
      maxX,
    );

    playerPosition.world.y = clamp(
      playerPosition.world.y - movementVector.y,
      minY,
      maxY,
    );
  }
}
