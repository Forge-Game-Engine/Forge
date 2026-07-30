import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import { PushEcsComponent, pushId } from './_push.component';

export const createPushEcsSystem = (
  time: Time,
): EcsSystem<[PushEcsComponent]> => ({
  query: [pushId],
  update: (_world, { components: [pushes] }) => {
    for (const push of pushes) {
      push.elapsedSeconds += time.deltaTimeInSeconds;

      if (push.elapsedSeconds < push.intervalSeconds) {
        continue;
      }

      push.elapsedSeconds = 0;

      const worldContactPoint = push.localContactPoint.rotate(push.body.angle);

      push.body.applyImpulse(push.impulse, worldContactPoint);
    }
  },
});
