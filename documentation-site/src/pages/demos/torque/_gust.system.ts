import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import { GustEcsComponent, gustId } from './_gust.component';

export const createGustEcsSystem = (
  time: Time,
): EcsSystem<[GustEcsComponent, RigidBodyEcsComponent]> => ({
  query: [gustId, rigidBodyId],
  update: (_world, { components: [gustComponents, rigidBodies] }) => {
    for (let i = 0; i < gustComponents.length; i++) {
      const gustComponent = gustComponents[i];
      const rigidBody = rigidBodies[i];

      gustComponent.elapsedSeconds += time.deltaTimeInSeconds;

      if (gustComponent.elapsedSeconds < gustComponent.intervalSeconds) {
        continue;
      }

      gustComponent.elapsedSeconds = 0;

      rigidBody.angularVelocity +=
        gustComponent.strength * gustComponent.nextSign;

      gustComponent.nextSign *= -1;
    }
  },
});
