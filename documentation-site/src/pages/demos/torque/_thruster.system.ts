import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
  applyTorque,
  RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import { ThrusterEcsComponent, thrusterId } from './_thruster.component';

/**
 * Applies each matched entity's `ThrusterEcsComponent.torque` directly to
 * its `RigidBodyEcsComponent` while `holdAction` is held, via `applyTorque`.
 * Must run before whatever system integrates velocity into position
 * (`createEulerIntegrationEcsSystem`) so the torque applied this tick is
 * reflected in this tick's integration.
 */
export const createThrusterEcsSystem = (
  time: Time,
): EcsSystem<[ThrusterEcsComponent, RigidBodyEcsComponent]> => ({
  query: [thrusterId, rigidBodyId],
  update: (_world, { components: [thrusterComponents, rigidBodies] }) => {
    for (let i = 0; i < thrusterComponents.length; i++) {
      const thrusterComponent = thrusterComponents[i];
      const rigidBody = rigidBodies[i];

      if (!thrusterComponent.holdAction.isHeld) {
        continue;
      }

      applyTorque(thrusterComponent.torque, time.deltaTimeInSeconds, rigidBody);
    }
  },
});
