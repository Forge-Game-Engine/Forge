import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  Time,
} from '@forge-game-engine/forge/common';
import { clamp, Vector2 } from '@forge-game-engine/forge/math';
import { Axis2dAction } from '@forge-game-engine/forge/input';
import { PlayerEcsComponent, PlayerId } from './_player.component';

export const createMovementEcsSystem = (
  moveAction: Axis2dAction,
  time: Time,
): EcsSystem<
  [PlayerEcsComponent, PositionEcsComponent, RotationEcsComponent]
> => ({
  query: [PlayerId, positionId, rotationId],
  run: (result) => {
    const [playerComponent, positionComponent, rotationComponent] =
      result.components;

    const { baseSpeed, speedRange, turnSpeed, minX, maxX, minY, maxY } =
      playerComponent;
    const { x: turnInput, y: throttleInput } = moveAction.value;
    const deltaTime = time.deltaTimeInSeconds;

    // The car cruises forward on its own; steering only changes its heading,
    // so turning alone curves it through a circle instead of requiring
    // throttle input to also be held down.
    rotationComponent.world += turnInput * turnSpeed * deltaTime;

    const speed = baseSpeed + throttleInput * speedRange;
    const heading = rotationComponent.world;

    const headingDirection = new Vector2(Math.sin(heading), Math.cos(heading));
    const movement = headingDirection.multiply(speed * deltaTime);

    positionComponent.world.x = clamp(
      positionComponent.world.x + movement.x,
      minX,
      maxX,
    );

    positionComponent.world.y = clamp(
      positionComponent.world.y + movement.y,
      minY,
      maxY,
    );
  },
});
