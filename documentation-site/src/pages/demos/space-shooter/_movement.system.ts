import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { clamp } from '@forge-game-engine/forge/math';
import { Axis2dAction } from '@forge-game-engine/forge/input';
import { PlayerEcsComponent, PlayerId } from './_player.component';

export const createMovementEcsSystem = (
  moveAction: Axis2dAction,
  time: Time,
): EcsSystem<[PlayerEcsComponent, PositionEcsComponent]> => ({
  query: [PlayerId, positionId],
  run: (result) => {
    const [playerComponent, positionComponent] = result.components;

    const { speed, minX, maxX, minY, maxY } = playerComponent;

    const movementVector = moveAction.value
      .multiply(speed * 10)
      .multiply(time.deltaTimeInSeconds);

    positionComponent.world.x = clamp(
      positionComponent.world.x + movementVector.x,
      minX,
      maxX,
    );

    positionComponent.world.y = clamp(
      positionComponent.world.y - movementVector.y,
      minY,
      maxY,
    );
  },
});
