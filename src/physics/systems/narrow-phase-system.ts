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
 * The system also owns every `ContactsEcsComponent`: it queries for them
 * and, each tick, rewrites their `touching`, `started` and `ended` lists
 * from this tick's overlaps, sensors included. An entity that has a
 * `ContactsEcsComponent` but no collider touches nothing, so its previous
 * contacts end.
 * @param collisionPairs - The broad-phase system's output: candidate
 * entity pairs whose AABBs overlap, each pair listed once.
 * @param collisionManifolds - The array the system clears and refills with
 * the current tick's confirmed collisions between solid colliders.
 * @returns An ECS system that populates `collisionManifolds` and every
 * `ContactsEcsComponent` every tick.
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

      const manifolds = detectCollision(bodyA, bodyB);

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

      for (const manifold of manifolds) {
        collisionManifolds.push({ entityA, entityB, ...manifold });
      }
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
