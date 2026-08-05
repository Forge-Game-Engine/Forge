import { positionId } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { RigidBodyEcsComponent, rigidBodyId } from '@forge-game-engine/forge/physics';
import {
  PlatformMoverEcsComponent,
  platformMoverId,
} from './_platform-mover.component';

/**
 * Reverses a `PlatformMoverEcsComponent` entity's kinematic `velocity.x`
 * once its `PositionEcsComponent.world.x` reaches either `leftX`/`rightX`.
 * Nothing else drives the platform's motion - `createEulerIntegrationEcsSystem`
 * moves it every tick from `velocity` alone, exactly like a dynamic body,
 * the platform just never has gravity/impulses applied to it.
 */
export const createPlatformMoverEcsSystem = (): EcsSystem<
  [PlatformMoverEcsComponent, RigidBodyEcsComponent]
> => ({
  query: [platformMoverId, rigidBodyId],
  update: (world, { entities, components: [movers, rigidBodies] }) => {
    for (let i = 0; i < entities.length; i++) {
      const mover = movers[i];
      const rigidBody = rigidBodies[i];
      const position = world.getComponent(entities[i], positionId);

      if (position === null) {
        continue;
      }

      if (position.world.x <= mover.leftX && rigidBody.velocity.x < 0) {
        rigidBody.velocity.x = mover.speed;
      } else if (
        position.world.x >= mover.rightX &&
        rigidBody.velocity.x > 0
      ) {
        rigidBody.velocity.x = -mover.speed;
      }
    }
  },
});
