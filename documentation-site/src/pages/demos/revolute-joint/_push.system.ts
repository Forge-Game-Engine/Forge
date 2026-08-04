import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { positionId, rotationId, Time } from '@forge-game-engine/forge/common';
import { Vec2 } from '@forge-game-engine/forge/math';
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

      // Clone before rotating/adding: `push.localContactPoint` is a
      // persistent component field reused every push, and `position.world`
      // is the entity's live position, still needed unchanged for
      // `applyImpulse`'s `entityPosition` argument below.
      const worldContactPoint = Vec2.add(
        Vec2.clone(position.world),
        Vec2.rotate(Vec2.clone(push.localContactPoint), rotation.world),
      );

      applyImpulse(push.impulse, worldContactPoint, position.world, rigidBody);
    }
  },
});
