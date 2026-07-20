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
  run: (result) => {
    const [gustComponent, physicsBodyComponent] = result.components;

    gustComponent.elapsedSeconds += time.deltaTimeInSeconds;

    if (gustComponent.elapsedSeconds < gustComponent.intervalSeconds) {
      return;
    }

    gustComponent.elapsedSeconds = 0;

    physicsBodyComponent.physicsBody.angularVelocity +=
      gustComponent.strength * gustComponent.nextSign;

    gustComponent.nextSign *= -1;
  },
});
