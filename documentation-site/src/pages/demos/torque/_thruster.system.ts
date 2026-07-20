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
 * via `RigidBody.applyTorque`. Must run before `createPhysicsEcsSystem` in
 * the same tick so the torque applied this tick is reflected in the same
 * tick's `physicsWorld.step` (see the Applying Forces guide's
 * registration-order caution).
 */
export const createThrusterEcsSystem = (
  time: Time,
): EcsSystem<[ThrusterEcsComponent, PhysicsBodyEcsComponent]> => ({
  query: [thrusterId, PhysicsBodyId],
  run: (result) => {
    const [thrusterComponent, physicsBodyComponent] = result.components;

    if (!thrusterComponent.holdAction.isHeld) {
      return;
    }

    physicsBodyComponent.physicsBody.applyTorque(
      thrusterComponent.torque,
      time.deltaTimeInSeconds,
    );
  },
});
