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
  update: (_world, { components: [bulletComponents, positionComponents] }) => {
    for (let i = 0; i < bulletComponents.length; i++) {
      const bulletComponent = bulletComponents[i];
      const positionComponent = positionComponents[i];

      positionComponent.world.y +=
        bulletComponent.speed * time.deltaTimeInSeconds;
    }
  },
});
