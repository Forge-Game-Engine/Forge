import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
  PhysicsBodyEcsComponent,
  PhysicsBodyId,
} from '@forge-game-engine/forge/physics';
import { GustEcsComponent, gustId } from './_gust.component';

export const createGustEcsSystem = (
  time: Time,
): EcsSystem<[GustEcsComponent, PhysicsBodyEcsComponent]> => ({
  query: [gustId, PhysicsBodyId],
  update: (_world, { components: [gustComponents, physicsBodyComponents] }) => {
    for (let i = 0; i < gustComponents.length; i++) {
      const gustComponent = gustComponents[i];
      const physicsBodyComponent = physicsBodyComponents[i];

      gustComponent.elapsedSeconds += time.deltaTimeInSeconds;

      if (gustComponent.elapsedSeconds < gustComponent.intervalSeconds) {
        continue;
      }

      gustComponent.elapsedSeconds = 0;

      physicsBodyComponent.physicsBody.angularVelocity +=
        gustComponent.strength * gustComponent.nextSign;

      gustComponent.nextSign *= -1;
    }
  },
});
