import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  Time,
} from '@forge-game-engine/forge/common';

export const createDemoEcsSystem = (
  time: Time,
): EcsSystem<[PositionEcsComponent, RotationEcsComponent]> => ({
  query: [positionId, rotationId],
  run: (queryResult) => {
    const { components } = queryResult;

    const [position, rotation] = components;

    position.world.x = Math.sin(time.timeInSeconds) * 100;
    position.world.y = Math.cos(time.timeInSeconds) * 100;
    rotation.world = time.timeInSeconds;
  },
});
