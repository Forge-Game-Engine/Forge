import { positionId, rotationId } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { getColliderRotation } from '../collider-rotation.js';
import { detectCollision } from '../collision/detect-collision.js';
import { colliderId } from '../components/collider-component.js';
import {
  ContactsEcsComponent,
  contactsId,
} from '../components/contacts-component.js';
import { rigidBodyId } from '../components/rigidbody-component.js';
import { isContactAsleep } from '../is-body-awake.js';
import { CollisionBody } from '../types/collision-body.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { CollisionPair } from '../types/collision-pair.js';

/**
 * Creates an ECS system that runs narrow-phase (SAT) collision detection
 * against every pair in `collisionPairs`, using each entity's world
 * position/rotation (local values are only meaningful to the parenting
 * system; an entity with no `RotationEcsComponent` is treated as unrotated).
 *
 * Every actual collision between two solid colliders is written into
 * `collisionManifolds`, the input to collision resolution. A single pair
 * can contribute more than one manifold - a body straddling several of a
 * `TerrainCollider`'s surface edges gets one per edge it touches (see
 * `detectCollision`). An overlap involving a sensor collider is never
 * written there, so it's never resolved.
 *
 * A pair in a sleeping island isn't tested again. When neither entity is
 * awake (see `isBodyAwake`) and at least one of them is a sleeping
 * `'dynamic'` body whose `sleepRecord` holds manifolds for the pair, the
 * system writes those manifolds unchanged, the way Box2D keeps a sleeping
 * island's contacts without updating them. The contact stays in both
 * entities' `touching`, the sleep system keeps seeing it, and collision
 * resolution keeps its accumulated impulses for when the island wakes.
 * Every other pair is tested: one with an awake side (which includes a
 * sleeping body whose `ColliderEcsComponent.collider` was replaced, as a
 * rebuilt tilemap layer does, or that rests on an entity game code moved
 * or reshaped), one the record has no manifolds for (a new contact), and
 * every sensor pair.
 *
 * The system also owns every `ContactsEcsComponent`: it queries for them
 * and, each step, rewrites their `touching`, `started` and `ended` lists
 * from this step's overlaps, sensors included. An entity that has a
 * `ContactsEcsComponent` but no collider touches nothing, so its previous
 * contacts end.
 *
 * Register it in the fixed-update group (`registerFixedUpdate`) with the
 * other physics systems, after a transform system and the broad phase, and
 * register systems that react to `started`/`ended` or read
 * `collisionManifolds` after it in the same group. Both describe one step,
 * and a frame can run several steps or none.
 * @param collisionPairs - The broad-phase system's output: candidate
 * entity pairs whose AABBs overlap, each pair listed once.
 * @param collisionManifolds - The array the system clears and refills with
 * the current step's confirmed collisions between solid colliders.
 * @returns An ECS system that populates `collisionManifolds` and every
 * `ContactsEcsComponent` every step.
 */
export const createNarrowPhaseEcsSystem = (
  collisionPairs: CollisionPair[],
  collisionManifolds: CollisionManifold[],
): EcsSystem<[ContactsEcsComponent]> => ({
  query: [contactsId],
  update: (world, { entities, components: [contacts] }) => {
    collisionManifolds.length = 0;

    const hasContacts = new Set(entities);
    const touchingByEntity = new Map<number, number[]>();

    const recordContact = (entity: number, other: number): void => {
      if (!hasContacts.has(entity)) {
        return;
      }

      const touching = touchingByEntity.get(entity);

      if (touching) {
        touching.push(other);
      } else {
        touchingByEntity.set(entity, [other]);
      }
    };

    for (const { entityA, entityB } of collisionPairs) {
      const bodyA = getCollisionBody(world, entityA);
      const bodyB = getCollisionBody(world, entityB);

      if (bodyA === null || bodyB === null) {
        continue;
      }

      const isSensorPair = bodyA.sensor || bodyB.sensor;

      // A sensor overlap is only ever reported through contacts, so there's
      // nothing to detect when neither entity records them.
      if (
        isSensorPair &&
        !hasContacts.has(entityA) &&
        !hasContacts.has(entityB)
      ) {
        continue;
      }

      // Sensor pairs have no manifolds to reuse, so they're always tested.
      const manifolds =
        (isSensorPair
          ? null
          : findSleepingManifolds(world, entityA, entityB)) ??
        detectCollision(bodyA, bodyB).map((manifold): CollisionManifold => ({
          entityA,
          entityB,
          colliderA: bodyA.collider,
          colliderB: bodyB.collider,
          ...manifold,
        }));

      if (manifolds.length === 0) {
        continue;
      }

      // Each pair is listed once, so recording it once here (not once per
      // manifold) keeps every entity's `touching` free of duplicates.
      recordContact(entityA, entityB);
      recordContact(entityB, entityA);

      if (isSensorPair) {
        continue;
      }

      collisionManifolds.push(...manifolds);
    }

    for (let i = 0; i < entities.length; i++) {
      updateContacts(
        contacts[i],
        touchingByEntity.get(entities[i]) ?? noContacts,
      );
    }
  },
});

const noContacts: readonly number[] = Object.freeze([]);

/**
 * The manifolds a sleeping body recorded for a pair when it fell asleep
 * (`RigidBodySleepRecord.manifolds`), or `null` when the pair has to be
 * tested. Neither entity of a sleeping contact (see `isContactAsleep`)
 * moved or changed its collider since then (either would count as
 * disturbing the sleeping body), so the manifolds are still right. Reusing
 * them, rather than dropping them, is what keeps the contact in
 * `touching`, keeps the bodies linked in their island, and lets collision
 * resolution keep the contact's accumulated impulses for when the island
 * wakes. A pair the record has no manifolds for is tested, so a new contact
 * is still found.
 */
function findSleepingManifolds(
  world: EcsWorld,
  entityA: number,
  entityB: number,
): CollisionManifold[] | null {
  if (!isContactAsleep(world, entityA, entityB)) {
    return null;
  }

  const manifolds = findRecordedManifolds(world, entityA, entityA, entityB);
  const recorded =
    manifolds.length > 0
      ? manifolds
      : findRecordedManifolds(world, entityB, entityA, entityB);

  return recorded.length === 0 ? null : recorded;
}

/**
 * The manifolds between `entityA` and `entityB`, in that order, in
 * `entity`'s sleep record. Empty when `entity` has no sleep record.
 */
function findRecordedManifolds(
  world: EcsWorld,
  entity: number,
  entityA: number,
  entityB: number,
): CollisionManifold[] {
  const record = world.getComponent(entity, rigidBodyId)?.sleepRecord;

  if (!record) {
    return [];
  }

  return record.manifolds.filter(
    (manifold) => manifold.entityA === entityA && manifold.entityB === entityB,
  );
}

function updateContacts(
  contacts: ContactsEcsComponent,
  touching: readonly number[],
): void {
  const previous = contacts.touching;

  if (touching.length === 0 && previous.length === 0) {
    contacts.started = noContacts;
    contacts.ended = noContacts;

    return;
  }

  const previousSet = new Set(previous);
  const currentSet = new Set(touching);

  contacts.started = touching.filter((entity) => !previousSet.has(entity));
  contacts.ended = previous.filter((entity) => !currentSet.has(entity));
  contacts.touching = touching;
}

function getCollisionBody(
  world: EcsWorld,
  entity: number,
): (CollisionBody & { sensor: boolean }) | null {
  const position = world.getComponent(entity, positionId);
  const rotation = world.getComponent(entity, rotationId);
  const collider = world.getComponent(entity, colliderId);

  if (position === null || collider === null) {
    return null;
  }

  return {
    position: position.world,
    rotation: getColliderRotation(rotation),
    collider: collider.collider,
    sensor: collider.sensor,
  };
}
