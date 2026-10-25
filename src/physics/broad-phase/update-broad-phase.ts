import {
  PositionEcsComponent,
  RotationEcsComponent,
  rotationId,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { getColliderRotation } from '../collider-rotation.js';
import { aabbsOverlap } from '../collision/aabb-overlap.js';
import { collidersCanCollide } from '../collision/collision-filter.js';
import {
  BroadPhaseEcsComponent,
  BroadPhasePair,
  BroadPhaseProxy,
} from '../components/broad-phase-component.js';
import { ColliderEcsComponent } from '../components/collider-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';
import { isStaticBody } from '../is-static-body.js';
import { Aabb } from '../types/aabb.js';
import { CollisionPair } from '../types/collision-pair.js';
import { DynamicAabbTree } from './dynamic-aabb-tree.js';

/**
 * Brings `broadPhase` up to date with this step's colliders and writes the
 * pairs whose tight boxes overlap to `collisionPairs`, the way Box2D's
 * broad phase does:
 *
 * 1. Every collider entity's record is synced: a collider whose pose,
 *    shape and component didn't change keeps its `aabb` and its proxy;
 *    one that did has its `aabb` recomputed and its proxy moved. A proxy
 *    whose fat box changed, that is new, that changed tree or whose filter
 *    changed goes in the move buffer.
 * 2. Records of entities that left the query are destroyed with their
 *    pairs.
 * 3. Every proxy in the move buffer looks for new pairs in the moving tree
 *    and, unless it's static, the static tree. Two static colliders are
 *    never paired.
 * 4. New pairs are merged into the sorted pair cache.
 * 5. Cached pairs whose fat boxes separated, or whose filters exclude each
 *    other, are dropped; the rest whose tight boxes overlap are written to
 *    `collisionPairs`, sorted by `(entityA, entityB)`.
 *
 * Only `createBroadPhaseEcsSystem` calls this: it's the one writer of the
 * broad-phase component and of `ColliderEcsComponent.aabb`.
 * @param broadPhase - The world's broad phase.
 * @param world - The world the colliders belong to.
 * @param entities - Every entity with a position and a collider.
 * @param positions - The entities' positions, in the same order.
 * @param colliders - The entities' colliders, in the same order.
 * @param collisionPairs - The array to clear and fill with this step's
 * pairs.
 */
export function updateBroadPhase(
  broadPhase: BroadPhaseEcsComponent,
  world: EcsWorld,
  entities: readonly number[],
  positions: readonly PositionEcsComponent[],
  colliders: readonly ColliderEcsComponent[],
  collisionPairs: CollisionPair[],
): void {
  const getRigidBody =
    world.getComponentAccessor<RigidBodyEcsComponent>(rigidBodyId);
  const getRotation =
    world.getComponentAccessor<RotationEcsComponent>(rotationId);
  const moved: BroadPhaseProxy[] = [];

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const collider = colliders[i];

    syncProxy(
      broadPhase,
      moved,
      getOrCreateRecord(broadPhase, entity, collider),
      collider,
      positions[i],
      getColliderRotation(getRotation(entity)),
      isStaticBody(getRigidBody(entity)),
    );
  }

  destroyUnseenRecords(broadPhase);
  mergePairs(broadPhase.pairs, findNewPairs(broadPhase, moved));
  sweepPairs(broadPhase.pairs, collisionPairs);
}

/**
 * Finds `entity`'s record, or creates an empty one that has no proxy yet.
 */
const getOrCreateRecord = (
  broadPhase: BroadPhaseEcsComponent,
  entity: number,
  collider: ColliderEcsComponent,
): BroadPhaseProxy => {
  const existing = broadPhase.proxies.get(entity);

  if (existing !== undefined) {
    return existing;
  }

  const record: BroadPhaseProxy = {
    entity,
    collider,
    shape: collider.collider,
    // NaN never equals itself, so a new record always computes its bounds.
    x: Number.NaN,
    y: Number.NaN,
    rotation: Number.NaN,
    category: collider.category,
    mask: collider.mask,
    isStatic: false,
    proxyId: null,
    fatAabb: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
    pairs: new Map(),
    seen: false,
    moved: false,
  };

  broadPhase.proxies.set(entity, record);

  return record;
};

/**
 * Step 1 for one collider: recomputes its bounds if its pose, shape or
 * component changed, puts its proxy in the right tree, and adds it to the
 * move buffer if it has to look for new pairs.
 */
const syncProxy = (
  broadPhase: BroadPhaseEcsComponent,
  moved: BroadPhaseProxy[],
  record: BroadPhaseProxy,
  component: ColliderEcsComponent,
  position: PositionEcsComponent,
  rotation: number,
  isStatic: boolean,
): void => {
  record.seen = true;

  const changed = syncBounds(record, component, position, rotation);

  if (record.proxyId !== null && record.isStatic !== isStatic) {
    destroyProxy(broadPhase, record);
  }

  record.isStatic = isStatic;

  const { aabb } = component;

  if (!isFiniteBox(aabb)) {
    if (record.proxyId !== null) {
      destroyProxy(broadPhase, record);
    }

    return;
  }

  const tree = getTree(broadPhase, record);

  if (record.proxyId === null) {
    record.proxyId = tree.createProxy(aabb, record.entity);
    markMoved(broadPhase, moved, record);
  } else if (changed && tree.moveProxy(record.proxyId, aabb)) {
    markMoved(broadPhase, moved, record);
  }

  // A changed filter can allow pairs that were excluded, so the proxy looks
  // for them again (Box2D's re-filter). Pairs it now excludes are dropped by
  // the sweep.
  if (
    record.category !== component.category ||
    record.mask !== component.mask
  ) {
    record.category = component.category;
    record.mask = component.mask;
    markMoved(broadPhase, moved, record);
  }
};

/**
 * Recomputes the collider's `aabb` when its pose, shape or component
 * changed since the record was last synced.
 * @returns Whether the bounds were recomputed.
 */
const syncBounds = (
  record: BroadPhaseProxy,
  component: ColliderEcsComponent,
  position: PositionEcsComponent,
  rotation: number,
): boolean => {
  const { world } = position;

  if (
    record.collider === component &&
    record.shape === component.collider &&
    record.x === world.x &&
    record.y === world.y &&
    record.rotation === rotation
  ) {
    return false;
  }

  const box = component.collider.computeAabb(world, rotation);

  component.aabb.min = box.min;
  component.aabb.max = box.max;
  record.collider = component;
  record.shape = component.collider;
  record.x = world.x;
  record.y = world.y;
  record.rotation = rotation;

  return true;
};

/**
 * Puts a record in this run's move buffer, once, with a copy of its
 * proxy's current fat box.
 */
const markMoved = (
  broadPhase: BroadPhaseEcsComponent,
  moved: BroadPhaseProxy[],
  record: BroadPhaseProxy,
): void => {
  if (record.proxyId === null) {
    return;
  }

  getTree(broadPhase, record).getFatAabb(record.proxyId, record.fatAabb);

  if (record.moved) {
    return;
  }

  record.moved = true;
  moved.push(record);
};

/**
 * Removes a record's proxy from its tree and drops every pair it was in.
 */
const destroyProxy = (
  broadPhase: BroadPhaseEcsComponent,
  record: BroadPhaseProxy,
): void => {
  if (record.proxyId === null) {
    return;
  }

  getTree(broadPhase, record).destroyProxy(record.proxyId);
  record.proxyId = null;

  for (const pair of record.pairs.values()) {
    pair.removed = true;
    getOtherProxy(pair, record).pairs.delete(record.entity);
  }

  record.pairs.clear();
};

/**
 * Step 2: destroys the records of entities the system didn't visit this
 * run (their collider or position was removed, or the entity was), and
 * clears the others' marks for the next run.
 */
const destroyUnseenRecords = (broadPhase: BroadPhaseEcsComponent): void => {
  for (const record of broadPhase.proxies.values()) {
    if (record.seen) {
      record.seen = false;

      continue;
    }

    destroyProxy(broadPhase, record);
    broadPhase.proxies.delete(record.entity);
  }
};

/**
 * Step 3: queries the trees with every moved proxy's fat box and caches
 * each new pair it finds.
 * @returns The new pairs, sorted by `(entityA, entityB)`.
 */
const findNewPairs = (
  broadPhase: BroadPhaseEcsComponent,
  moved: readonly BroadPhaseProxy[],
): BroadPhasePair[] => {
  const newPairs: BroadPhasePair[] = [];
  let self: BroadPhaseProxy | null = null;

  // Every candidate is visited: the query never stops early.
  const visit = (_proxyId: number, other: number): boolean => {
    if (self !== null) {
      addNewPair(broadPhase, newPairs, self, other);
    }

    return true;
  };

  for (const record of moved) {
    self = record;
    broadPhase.movingTree.query(record.fatAabb, visit);

    if (!record.isStatic) {
      broadPhase.staticTree.query(record.fatAabb, visit);
    }
  }

  for (const record of moved) {
    record.moved = false;
  }

  return newPairs.sort(comparePairs);
};

/**
 * Creates the pair between a moved proxy and a candidate its query found,
 * unless the candidate is the proxy itself, the pair is cached already, the
 * filters exclude it, or the candidate's own query adds it.
 */
const addNewPair = (
  broadPhase: BroadPhaseEcsComponent,
  newPairs: BroadPhasePair[],
  self: BroadPhaseProxy,
  other: number,
): void => {
  const otherRecord = broadPhase.proxies.get(other);

  // When both proxies moved, the one with the higher handle adds the pair,
  // so it isn't added twice. The other's query finds this one, as fat boxes
  // overlap both ways and a moving proxy queries both trees.
  if (
    other === self.entity ||
    otherRecord === undefined ||
    (otherRecord.moved && other > self.entity) ||
    self.pairs.has(other) ||
    !collidersCanCollide(self.collider, otherRecord.collider)
  ) {
    return;
  }

  newPairs.push(createPair(self, otherRecord));
};

/**
 * Creates a pair between two records and caches it on both.
 */
const createPair = (
  first: BroadPhaseProxy,
  second: BroadPhaseProxy,
): BroadPhasePair => {
  const [proxyA, proxyB] =
    first.entity < second.entity ? [first, second] : [second, first];
  const pair: BroadPhasePair = {
    proxyA,
    proxyB,
    output: { entityA: proxyA.entity, entityB: proxyB.entity },
    removed: false,
  };

  proxyA.pairs.set(proxyB.entity, pair);
  proxyB.pairs.set(proxyA.entity, pair);

  return pair;
};

/**
 * Step 4: merges sorted new pairs into the sorted cache in place, from the
 * end, so nothing is allocated.
 */
const mergePairs = (
  pairs: BroadPhasePair[],
  newPairs: readonly BroadPhasePair[],
): void => {
  if (newPairs.length === 0) {
    return;
  }

  let oldIndex = pairs.length - 1;
  let newIndex = newPairs.length - 1;
  let target = pairs.length + newPairs.length - 1;

  // Grow the cache to its new length; the merge below overwrites every
  // slot from the end. (A spread push would overflow the call stack on a
  // first step with many pairs.)
  for (const pair of newPairs) {
    pairs.push(pair);
  }

  while (newIndex >= 0) {
    if (
      oldIndex >= 0 &&
      comparePairs(pairs[oldIndex], newPairs[newIndex]) > 0
    ) {
      pairs[target--] = pairs[oldIndex--];
    } else {
      pairs[target--] = newPairs[newIndex--];
    }
  }
};

/**
 * Step 5: drops cached pairs that were removed, whose fat boxes no longer
 * overlap or whose filters exclude each other, keeping the cache's order,
 * and writes the rest whose tight boxes overlap to `collisionPairs`.
 */
const sweepPairs = (
  pairs: BroadPhasePair[],
  collisionPairs: CollisionPair[],
): void => {
  collisionPairs.length = 0;

  let kept = 0;

  for (const pair of pairs) {
    if (pair.removed) {
      continue;
    }

    const { proxyA, proxyB } = pair;

    if (
      !aabbsOverlap(proxyA.fatAabb, proxyB.fatAabb) ||
      !collidersCanCollide(proxyA.collider, proxyB.collider)
    ) {
      proxyA.pairs.delete(proxyB.entity);
      proxyB.pairs.delete(proxyA.entity);

      continue;
    }

    pairs[kept++] = pair;

    if (aabbsOverlap(proxyA.collider.aabb, proxyB.collider.aabb)) {
      collisionPairs.push(pair.output);
    }
  }

  pairs.length = kept;
};

/**
 * Orders pairs by their lower entity handle, then their higher one.
 */
const comparePairs = (a: BroadPhasePair, b: BroadPhasePair): number =>
  a.proxyA.entity - b.proxyA.entity || a.proxyB.entity - b.proxyB.entity;

/**
 * The tree a record's proxy belongs in.
 */
const getTree = (
  broadPhase: BroadPhaseEcsComponent,
  record: BroadPhaseProxy,
): DynamicAabbTree<number> =>
  record.isStatic ? broadPhase.staticTree : broadPhase.movingTree;

/**
 * The record on the other side of `pair` from `record`.
 */
const getOtherProxy = (
  pair: BroadPhasePair,
  record: BroadPhaseProxy,
): BroadPhaseProxy => (pair.proxyA === record ? pair.proxyB : pair.proxyA);

/**
 * Whether a box is finite with `min <= max` on both axes, as a tree
 * requires. An empty chain's box (`min` at `+Infinity`) and a `NaN`
 * position's box aren't.
 */
const isFiniteBox = ({ min, max }: Aabb): boolean =>
  Number.isFinite(min.x) &&
  Number.isFinite(min.y) &&
  Number.isFinite(max.x) &&
  Number.isFinite(max.y) &&
  min.x <= max.x &&
  min.y <= max.y;
