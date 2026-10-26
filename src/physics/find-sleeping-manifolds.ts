import { EcsWorld } from '../ecs/ecs-world.js';
import { rigidBodyId } from './components/rigidbody-component.js';
import { isContactAsleep } from './is-body-awake.js';
import { CollisionManifold } from './types/collision-manifold.js';

/**
 * The collision manifolds `createNarrowPhaseEcsSystem` writes for a pair of
 * solid colliders in place of testing it, or `null` when it tests the pair.
 *
 * The narrow phase reuses a pair's contact when neither entity is awake (see
 * `isBodyAwake`), at least one of them is a sleeping `'dynamic'` body,
 * and one of their `sleepRecord`s holds manifolds for the pair (with the
 * pair's `entityA` and `entityB` in the same order). Neither entity moved or
 * changed its collider since the body fell asleep (either would count as
 * disturbing it), so the manifolds are still right. Every other pair is
 * tested: one with an awake side, and one the records have no manifolds
 * for, which is a new contact. Sensor pairs are always tested, so the
 * narrow phase doesn't ask.
 *
 * The answer is for the world as it is when this is called, so it's what
 * the narrow phase would do with the pair on its next run, not what it did
 * on the latest one: a system that wakes or moves a body between the two
 * changes the answer. Use it for profiling or debug readouts, such as
 * counting how many of the broad phase's pairs a settled scene still tests.
 * @param world - The ECS world both entities belong to.
 * @param entityA - The pair's first entity, as the broad phase listed it.
 * @param entityB - The pair's second entity, as the broad phase listed it.
 * @returns The recorded manifolds the narrow phase reuses for the pair, or
 * `null` when it tests the pair.
 */
export function findSleepingManifolds(
  world: EcsWorld,
  entityA: number,
  entityB: number,
): readonly CollisionManifold[] | null {
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
): readonly CollisionManifold[] {
  const record = world.getComponent(entity, rigidBodyId)?.sleepRecord;

  if (!record) {
    return [];
  }

  return record.manifolds.filter(
    (manifold) => manifold.entityA === entityA && manifold.entityB === entityB,
  );
}
