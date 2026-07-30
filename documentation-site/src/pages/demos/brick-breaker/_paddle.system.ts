import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { Axis1dAction } from '@forge-game-engine/forge/input';
import { clamp } from '@forge-game-engine/forge/math';
import { PaddleEcsComponent, paddleId } from './_paddle.component';

export const createPaddleEcsSystem = (
  moveAction: Axis1dAction,
  time: Time,
): EcsSystem<[PaddleEcsComponent, PositionEcsComponent]> => ({
  query: [paddleId, positionId],
  update: (_world, { components: [paddleComponents, positionComponents] }) => {
    for (let i = 0; i < paddleComponents.length; i++) {
      const paddleComponent = paddleComponents[i];
      const positionComponent = positionComponents[i];
      const { speed, minX, maxX } = paddleComponent;

      positionComponent.world.x = clamp(
        positionComponent.world.x +
          moveAction.value * speed * time.deltaTimeInSeconds,
        minX,
        maxX,
      );
    }
  },
});
