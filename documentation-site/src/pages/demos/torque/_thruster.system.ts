import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
  PhysicsBodyEcsComponent,
  PhysicsBodyId,
} from '@forge-game-engine/forge/physics';
import { ThrusterEcsComponent, thrusterId } from './_thruster.component';

/**
 * Applies each matched entity's `ThrusterEcsComponent.torque` directly to
 * its `PhysicsBodyEcsComponent`'s `RigidBody` while `holdAction` is held,
 * via `RigidBody.applyTorque`. Must run before `createPhysicsSyncEcsSystem` in
 * the same tick so the torque applied this tick is reflected in the same
 * tick's `physicsWorld.step` (see the Applying Forces guide's
 * registration-order caution).
 */
export const createThrusterEcsSystem = (
  time: Time,
): EcsSystem<[ThrusterEcsComponent, PhysicsBodyEcsComponent]> => ({
  query: [thrusterId, PhysicsBodyId],
  update: (
    _world,
    { components: [thrusterComponents, physicsBodyComponents] },
  ) => {
    for (let i = 0; i < thrusterComponents.length; i++) {
      const thrusterComponent = thrusterComponents[i];
      const physicsBodyComponent = physicsBodyComponents[i];

      if (!thrusterComponent.holdAction.isHeld) {
        continue;
      }

      physicsBodyComponent.physicsBody.applyTorque(
        thrusterComponent.torque,
        time.deltaTimeInSeconds,
      );
    }
  },
});
