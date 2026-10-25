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
 * Runs in the fixed-update group, once per step, before whatever system
 * integrates velocity into position (`createEulerIntegrationEcsSystem`) so
 * the torque applied this step is reflected in this step's integration. A
 * held action reads the same in every step of a frame.
 */
export const createThrusterEcsSystem = (
  time: Time,
): EcsSystem<[ThrusterEcsComponent, RigidBodyEcsComponent]> => ({
  query: [thrusterId, rigidBodyId],
  update: (world, { entities, components: [thrusterComponents] }) => {
    for (let i = 0; i < thrusterComponents.length; i++) {
      const thrusterComponent = thrusterComponents[i];

      if (!thrusterComponent.holdAction.isHeld) {
        continue;
      }

      applyTorque(
        world,
        entities[i],
        thrusterComponent.torque,
        time.deltaTimeInSeconds,
      );
    }
  },
});
