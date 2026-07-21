import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { PhysicsWorld, RigidBody } from '@forge-game-engine/forge/physics';
import { AirControlEcsComponent, airControlId } from './_air-control.component';

/**
 * Returns whether `bodyA`/`bodyB` is a contact between `wheel` and a static
 * (ground) body, in either order.
 * @param bodyA - The first body in a `BodyCollisionPair`.
 * @param bodyB - The second body in a `BodyCollisionPair`.
 * @param wheel - The wheel body to check the pair against.
 */
function isWheelGroundContact(
  bodyA: RigidBody,
  bodyB: RigidBody,
  wheel: RigidBody,
): boolean {
  if (bodyA === wheel) {
    return bodyB.isStatic;
  }

  if (bodyB === wheel) {
    return bodyA.isStatic;
  }

  return false;
}

/**
 * Updates each matched entity's `AirControlEcsComponent` ground-contact
 * counts from `physicsWorld.collisionStarts`/`collisionEnds`, then, while
 * neither wheel has an active ground contact, applies a pitch torque to
 * `chassisBody` from `throttleInput` via `RigidBody.applyTorque` - positive
 * throttle (gas) pitches the nose up and back, negative throttle (brake)
 * pitches it down and forward. Must run after `createPhysicsSyncEcsSystem`'s
 * *previous* tick (i.e. anywhere before this tick's `createPhysicsSyncEcsSystem`)
 * so it reacts to last step's contacts, and before this tick's
 * `createPhysicsSyncEcsSystem` so the torque is reflected in this tick's
 * `physicsWorld.step` (see the Applying Forces guide's registration-order
 * caution).
 * @param physicsWorld - The physics world whose `collisionStarts`/
 * `collisionEnds` drive each wheel's grounded state.
 * @param time - The time instance used to scale the torque by the tick's
 * delta time.
 */
export const createAirControlEcsSystem = (
  physicsWorld: PhysicsWorld,
  time: Time,
): EcsSystem<[AirControlEcsComponent]> => ({
  query: [airControlId],
  run: (result) => {
    const [airControl] = result.components;
    const { chassisBody, frontWheelBody, rearWheelBody, throttleInput } =
      airControl;

    for (const { bodyA, bodyB } of physicsWorld.collisionStarts) {
      if (isWheelGroundContact(bodyA, bodyB, frontWheelBody)) {
        airControl.frontWheelGroundContacts++;
      }

      if (isWheelGroundContact(bodyA, bodyB, rearWheelBody)) {
        airControl.rearWheelGroundContacts++;
      }
    }

    for (const { bodyA, bodyB } of physicsWorld.collisionEnds) {
      if (isWheelGroundContact(bodyA, bodyB, frontWheelBody)) {
        airControl.frontWheelGroundContacts--;
      }

      if (isWheelGroundContact(bodyA, bodyB, rearWheelBody)) {
        airControl.rearWheelGroundContacts--;
      }
    }

    const isAirborne =
      airControl.frontWheelGroundContacts === 0 &&
      airControl.rearWheelGroundContacts === 0;

    if (!isAirborne) {
      return;
    }

    const torque = throttleInput.value * airControl.torqueStrength;

    chassisBody.applyTorque(torque, time.deltaTimeInSeconds);
  },
});
