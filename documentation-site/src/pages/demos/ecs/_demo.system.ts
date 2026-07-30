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
  update: (_world, queryResult) => {
    const { components } = queryResult;

    const [positions, rotations] = components;

    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const rotation = rotations[i];

      position.world.x = Math.sin(time.timeInSeconds) * 100;
      position.world.y = Math.cos(time.timeInSeconds) * 100;
      rotation.world = time.timeInSeconds;
    }
  },
});
