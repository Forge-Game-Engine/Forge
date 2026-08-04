import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { clamp, Vec2 } from '@forge-game-engine/forge/math';
import { Axis2dAction } from '@forge-game-engine/forge/input';
import { PlayerEcsComponent, PlayerId } from './_player.component';

export const createMovementEcsSystem = (
  moveAction: Axis2dAction,
  time: Time,
): EcsSystem<[PlayerEcsComponent, PositionEcsComponent]> => ({
  query: [PlayerId, positionId],
  update: (_world, { components: [playerComponents, positionComponents] }) => {
    for (let i = 0; i < playerComponents.length; i++) {
      const playerComponent = playerComponents[i];
      const positionComponent = positionComponents[i];

      const { speed, minX, maxX, minY, maxY } = playerComponent;

      // Clone before scaling: `moveAction.value` is the action's live,
      // persistent input state, not a disposable value.
      const movementVector = Vec2.multiply(
        Vec2.multiply(Vec2.clone(moveAction.value), speed * 10),
        time.deltaTimeInSeconds,
      );

      positionComponent.world.x = clamp(
        positionComponent.world.x + movementVector.x,
        minX,
        maxX,
      );

      positionComponent.world.y = clamp(
        positionComponent.world.y + movementVector.y,
        minY,
        maxY,
      );
    }
  },
});
