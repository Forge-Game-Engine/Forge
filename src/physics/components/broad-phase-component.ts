import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { DynamicAabbTree } from '../broad-phase/dynamic-aabb-tree.js';
import { Collider } from '../colliders/collider.js';
import { Aabb } from '../types/aabb.js';
import { CollisionPair } from '../types/collision-pair.js';
import { ColliderEcsComponent } from './collider-component.js';

/**
 * What the broad phase last built one collider entity's proxy from. Output
 * only: `createBroadPhaseEcsSystem` is the only writer of every field.
 */
export interface BroadPhaseProxy {
  /** The collider entity. */
  readonly entity: number;

  /**
   * The collider component the proxy was synced from. A replaced component
   * is synced again.
   */
  collider: ColliderEcsComponent;

  /**
   * The shape the proxy's bounds were computed from. Shapes don't change in
   * place, so a different object is the only way the shape changes.
   */
  shape: Collider;

  /** The world x position the bounds were computed from. */
  x: number;

  /** The world y position the bounds were computed from. */
  y: number;

  /** The world rotation, in radians, the bounds were computed from. */
  rotation: number;

  /** The `category` the proxy's pairs were found with. */
  category: number;

  /** The `mask` the proxy's pairs were found with. */
  mask: number;

  /**
   * Whether the proxy is in {@link BroadPhaseEcsComponent.staticTree}
   * (no rigid body, or a `'static'` one) or in
   * {@link BroadPhaseEcsComponent.movingTree}.
   */
  isStatic: boolean;

  /**
   * The proxy's id in its tree, or `null` while the collider's bounds aren't
   * finite (an empty chain, a `NaN` position) and it has no proxy.
   */
  proxyId: number | null;

  /** A copy of the proxy's fat box, as its tree stores it. */
  readonly fatAabb: Aabb;

  /** This proxy's cached pairs, keyed by the other entity. */
  readonly pairs: Map<number, BroadPhasePair>;

  /** Marks the proxy as visited during one run; `false` between runs. */
  seen: boolean;

  /**
   * Marks the proxy as needing to look for new pairs during one run;
   * `false` between runs.
   */
  moved: boolean;
}

/**
 * A pair of colliders whose fat boxes overlap, cached until they separate.
 * Output only.
 */
export interface BroadPhasePair {
  /** The proxy of the entity with the lower handle. */
  readonly proxyA: BroadPhaseProxy;

  /** The proxy of the entity with the higher handle. */
  readonly proxyB: BroadPhaseProxy;

  /**
   * The object written to `collisionPairs` on every step the pair's tight
   * boxes overlap, made once for the pair's lifetime.
   */
  readonly output: CollisionPair;

  /**
   * Set when one of the pair's proxies was destroyed, until the pair is
   * swept out of {@link BroadPhaseEcsComponent.pairs}.
   */
  removed: boolean;
}

/**
 * A world's persistent broad phase: a {@link DynamicAabbTree} of static
 * colliders, one of kinematic and dynamic colliders, a record of every
 * collider entity's proxy, and the pairs whose fat boxes overlap, all kept
 * from one step to the next so only colliders that moved look for new
 * pairs. Output only: `createBroadPhaseEcsSystem` is the only writer of
 * every field, and it reads this component from the world's broad-phase
 * entity, which {@link addBroadPhaseComponent}'s caller (usually
 * `createBroadPhase`) creates. A world has at most one.
 *
 * The trees reflect the broad phase's last run. Their fat boxes are up to a
 * few `aabbMargin`s larger than each collider's `aabb`.
 */
export interface BroadPhaseEcsComponent {
  /**
   * The proxies of static colliders (no rigid body, or a `'static'` one),
   * each valued by its entity.
   */
  readonly staticTree: DynamicAabbTree<number>;

  /**
   * The proxies of kinematic and dynamic colliders, each valued by its
   * entity.
   */
  readonly movingTree: DynamicAabbTree<number>;

  /** The record of every collider entity the broad phase last saw. */
  readonly proxies: Map<number, BroadPhaseProxy>;

  /** Every cached pair, sorted by `(entityA, entityB)`. */
  readonly pairs: BroadPhasePair[];
}

export const broadPhaseId =
  createComponentId<BroadPhaseEcsComponent>('broadPhase');

/**
 * Attaches an empty {@link BroadPhaseEcsComponent} to `entity`. Prefer
 * `createBroadPhase`, which creates the entity and checks the world doesn't
 * already have one.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @returns The attached component.
 */
export function addBroadPhaseComponent(
  world: EcsWorld,
  entity: number,
): BroadPhaseEcsComponent {
  return world.addComponent(entity, broadPhaseId, {
    staticTree: new DynamicAabbTree<number>(),
    movingTree: new DynamicAabbTree<number>(),
    proxies: new Map(),
    pairs: [],
  });
}
