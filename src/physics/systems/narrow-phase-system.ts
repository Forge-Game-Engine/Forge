import { positionId, rotationId } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { getColliderRotation } from '../collider-rotation.js';
import { Collider } from '../colliders/collider.js';
import { detectCollision } from '../collision/detect-collision.js';
import { colliderId } from '../components/collider-component.js';
import {
  ContactsEcsComponent,
  contactsId,
} from '../components/contacts-component.js';
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
 * awake (see `isBodyAwake`), at least one of them is a sleeping `'dynamic'`
 * body, and the pair had manifolds last tick computed from the colliders
 * both entities still have, the system writes last tick's manifolds back
 * unchanged, the way Box2D keeps a sleeping island's contacts without
 * updating them. The contact stays in both entities' `touching`, the sleep
 * system keeps seeing it, and collision resolution keeps its accumulated
 * impulses for when the island wakes. Every other pair is tested: one with
 * an awake side, one with no manifolds last tick (a new contact), one whose
 * `ColliderEcsComponent.collider` was replaced (a rebuilt tilemap layer)
 * and every sensor pair.
 *
 * The system also owns every `ContactsEcsComponent`: it queries for them
 * and, each tick, rewrites their `touching`, `started` and `ended` lists
 * from this tick's overlaps, sensors included. An entity that has a
 * `ContactsEcsComponent` but no collider touches nothing, so its previous
 * contacts end.
 * @param collisionPairs - The broad-phase system's output: candidate
 * entity pairs whose AABBs overlap, each pair listed once.
 * @param collisionManifolds - The array the system clears and refills with
 * the current tick's confirmed collisions between solid colliders. Pass the
 * same array every tick: the system reads last tick's contents to reuse a
 * sleeping pair's manifolds.
 * @returns An ECS system that populates `collisionManifolds` and every
 * `ContactsEcsComponent` every tick.
 */
export const createNarrowPhaseEcsSystem = (
  collisionPairs: CollisionPair[],
  collisionManifolds: CollisionManifold[],
): EcsSystem<[ContactsEcsComponent]> => ({
  query: [contactsId],
  update: (world, { entities, components: [contacts] }) => {
    const previousManifolds = groupManifoldsByPair(collisionManifolds);

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
      const sideA = { entity: entityA, collider: bodyA.collider };
      const sideB = { entity: entityB, collider: bodyB.collider };
      const manifolds =
        (isSensorPair
          ? null
          : findSleepingManifolds(world, previousManifolds, sideA, sideB)) ??
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

type ManifoldsByPair = Map<number, Map<number, CollisionManifold[]>>;

interface PairSide {
  entity: number;
  collider: Collider;
}

/**
 * Indexes last tick's manifolds by `entityA`, then `entityB`, so a pair's
 * manifolds can be found without searching the whole array.
 */
function groupManifoldsByPair(
  manifolds: readonly CollisionManifold[],
): ManifoldsByPair {
  const byPair: ManifoldsByPair = new Map();

  for (const manifold of manifolds) {
    let byEntityB = byPair.get(manifold.entityA);

    if (byEntityB === undefined) {
      byEntityB = new Map();
      byPair.set(manifold.entityA, byEntityB);
    }

    const pairManifolds = byEntityB.get(manifold.entityB);

    if (pairManifolds === undefined) {
      byEntityB.set(manifold.entityB, [manifold]);
    } else {
      pairManifolds.push(manifold);
    }
  }

  return byPair;
}

/**
 * Last tick's manifolds for a pair whose contact is asleep (see
 * `isContactAsleep`), or `null` when the pair has to be tested. Neither
 * body of a sleeping contact moved since last tick, so as long as both
 * entities still have the colliders the manifolds were computed from, the
 * manifolds are still right. Keeping them, rather than dropping them, is
 * what keeps the contact in `touching`, keeps the bodies linked in their
 * island, and lets collision resolution keep the contact's accumulated
 * impulses for when the island wakes. A pair with no manifolds last tick is
 * tested, so a new contact is still found.
 */
function findSleepingManifolds(
  world: EcsWorld,
  previousManifolds: ManifoldsByPair,
  sideA: PairSide,
  sideB: PairSide,
): CollisionManifold[] | null {
  const manifolds = previousManifolds.get(sideA.entity)?.get(sideB.entity);

  if (
    manifolds === undefined ||
    manifolds.some(
      (manifold) =>
        manifold.colliderA !== sideA.collider ||
        manifold.colliderB !== sideB.collider,
    ) ||
    !isContactAsleep(world, sideA.entity, sideB.entity)
  ) {
    return null;
  }

  return manifolds;
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
