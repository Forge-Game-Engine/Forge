import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { BulletEcsComponent, bulletId } from './_bullet.component';

export const createBulletEcsSystem = (
  time: Time,
): EcsSystem<[BulletEcsComponent, PositionEcsComponent]> => ({
  query: [bulletId, positionId],
  run: (result) => {
    const [bulletComponent, positionComponent] = result.components;

    positionComponent.world.y +=
      bulletComponent.speed * time.deltaTimeInSeconds;
  },
});
