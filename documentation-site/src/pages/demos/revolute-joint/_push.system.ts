import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { positionId, rotationId, Time } from '@forge-game-engine/forge/common';
import { applyImpulse, rigidBodyId } from '@forge-game-engine/forge/physics';
import { PushEcsComponent, pushId } from './_push.component';

export const createPushEcsSystem = (
  time: Time,
): EcsSystem<[PushEcsComponent]> => ({
  query: [pushId],
  update: (world, { components: [pushes] }) => {
    for (const push of pushes) {
      push.elapsedSeconds += time.deltaTimeInSeconds;

      if (push.elapsedSeconds < push.intervalSeconds) {
        continue;
      }

      push.elapsedSeconds = 0;

      const position = world.getComponent(push.entity, positionId);
      const rotation = world.getComponent(push.entity, rotationId);
      const rigidBody = world.getComponent(push.entity, rigidBodyId);

      if (position === null || rotation === null || rigidBody === null) {
        continue;
      }

      const worldContactPoint = position.world.add(
        push.localContactPoint.rotate(rotation.world),
      );

      applyImpulse(push.impulse, worldContactPoint, position.world, rigidBody);
    }
  },
});
