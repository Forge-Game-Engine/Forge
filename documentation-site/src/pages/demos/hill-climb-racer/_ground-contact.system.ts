import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { PhysicsWorld, RigidBody } from '@forge-game-engine/forge/physics';
import {
  GroundContactEcsComponent,
  groundContactId,
} from './_ground-contact.component';

/**
 * Returns whether `bodyA`/`bodyB` is a contact between `body` and a static
 * (ground) body, in either order.
 * @param bodyA - The first body in a `BodyCollisionPair`.
 * @param bodyB - The second body in a `BodyCollisionPair`.
 * @param body - The body to check the pair against.
 */
function isBodyGroundContact(
  bodyA: RigidBody,
  bodyB: RigidBody,
  body: RigidBody,
): boolean {
  if (bodyA === body) {
    return bodyB.isStatic;
  }

  if (bodyB === body) {
    return bodyA.isStatic;
  }

  return false;
}

/**
 * Updates each matched entity's `GroundContactEcsComponent.groundContacts`
 * from `physicsWorld.collisionStarts`/`collisionEnds`. Reacts to last step's
 * contacts one tick stale, the same lag any contact-based "am I grounded"
 * check in a fixed-step engine has - must run anywhere before this tick's
 * `createPhysicsSyncEcsSystem`, and before any system that reads a
 * `GroundContactEcsComponent` this same tick (`createWheelDriveEcsSystem`,
 * `createChassisStabilizerEcsSystem`, `createAirControlEcsSystem`).
 * @param physicsWorld - The physics world whose `collisionStarts`/
 * `collisionEnds` drive each body's grounded state.
 */
export const createGroundContactEcsSystem = (
  physicsWorld: PhysicsWorld,
): EcsSystem<[GroundContactEcsComponent]> => ({
  query: [groundContactId],
  run: (result) => {
    const [groundContact] = result.components;
    const { body } = groundContact;

    for (const { bodyA, bodyB } of physicsWorld.collisionStarts) {
      if (isBodyGroundContact(bodyA, bodyB, body)) {
        groundContact.groundContacts++;
      }
    }

    for (const { bodyA, bodyB } of physicsWorld.collisionEnds) {
      if (isBodyGroundContact(bodyA, bodyB, body)) {
        groundContact.groundContacts--;
      }
    }
  },
});
