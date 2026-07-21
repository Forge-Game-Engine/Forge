import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { PhysicsWorld, RigidBody } from '@forge-game-engine/forge/physics';
import {
  GroundContactEcsComponent,
  groundContactId,
} from './_ground-contact.component';

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
 * Updates each matched entity's `GroundContactEcsComponent` ground-contact
 * counts from `physicsWorld.collisionStarts`/`collisionEnds`. Reacts to last
 * step's contacts one tick stale, the same lag any contact-based "am I
 * grounded" check in a fixed-step engine has - must run anywhere before this
 * tick's `createPhysicsSyncEcsSystem`, and before any system that reads
 * `GroundContactEcsComponent` this same tick (`createChassisStabilizerEcsSystem`,
 * `createAirControlEcsSystem`).
 * @param physicsWorld - The physics world whose `collisionStarts`/
 * `collisionEnds` drive each wheel's grounded state.
 */
export const createGroundContactEcsSystem = (
  physicsWorld: PhysicsWorld,
): EcsSystem<[GroundContactEcsComponent]> => ({
  query: [groundContactId],
  run: (result) => {
    const [groundContact] = result.components;
    const { frontWheelBody, rearWheelBody } = groundContact;

    for (const { bodyA, bodyB } of physicsWorld.collisionStarts) {
      if (isWheelGroundContact(bodyA, bodyB, frontWheelBody)) {
        groundContact.frontWheelGroundContacts++;
      }

      if (isWheelGroundContact(bodyA, bodyB, rearWheelBody)) {
        groundContact.rearWheelGroundContacts++;
      }
    }

    for (const { bodyA, bodyB } of physicsWorld.collisionEnds) {
      if (isWheelGroundContact(bodyA, bodyB, frontWheelBody)) {
        groundContact.frontWheelGroundContacts--;
      }

      if (isWheelGroundContact(bodyA, bodyB, rearWheelBody)) {
        groundContact.rearWheelGroundContacts--;
      }
    }
  },
});
