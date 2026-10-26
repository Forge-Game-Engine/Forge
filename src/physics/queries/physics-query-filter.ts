import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { getColliderRotation } from '../collider-rotation.js';
import {
  allCollisionCategories,
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';
import { isStaticBody } from '../is-static-body.js';
import { Aabb } from '../types/aabb.js';
import { CollisionBody } from '../types/collision-body.js';

/**
 * Which colliders a physics query (`raycast`, `queryAabb`, `overlapPoint`)
 * can find. Every query filters the same way, so a filter written for one
 * finds the same colliders in another.
 */
export interface PhysicsQueryFilter {
  /**
   * The collider categories the query can find: a collider is found only
   * if its `category` shares a bit with this mask. The collider's own
   * `mask` isn't read. Defaults to {@link allCollisionCategories}.
   */
  mask: number;

  /**
   * When `true`, the query also finds sensor colliders. Defaults to
   * `false`, so a query aimed at bodies ignores trigger zones.
   */
  includeSensors: boolean;
}

/**
 * The filter every physics query starts from: every category, no sensors.
 */
export const defaultPhysicsQueryFilter: PhysicsQueryFilter = {
  mask: allCollisionCategories,
  includeSensors: false,
};

/**
 * The component accessors {@link readQueryCandidate} reads a candidate
 * through, made once per query.
 */
export interface QueryComponentAccessors {
  getCollider: (entity: number) => ColliderEcsComponent | null;
  getPosition: (entity: number) => PositionEcsComponent | null;
  getRotation: (entity: number) => RotationEcsComponent | null;
  getRigidBody: (entity: number) => RigidBodyEcsComponent | null;
}

/**
 * Makes the component accessors a physics query reads its candidates
 * through.
 * @param world - The world the query reads.
 * @returns The accessors.
 */
export function getQueryComponentAccessors(
  world: EcsWorld,
): QueryComponentAccessors {
  return {
    getCollider: world.getComponentAccessor<ColliderEcsComponent>(colliderId),
    getPosition: world.getComponentAccessor<PositionEcsComponent>(positionId),
    // Rotation and rigid bodies are optional for colliders (an entity
    // without a rotation is treated as unrotated, and one without a rigid
    // body as static), so they're read per entity rather than required.
    getRotation: world.getComponentAccessor<RotationEcsComponent>(rotationId),
    getRigidBody:
      world.getComponentAccessor<RigidBodyEcsComponent>(rigidBodyId),
  };
}

/**
 * A broad-phase tree candidate a query goes on to test: its collider at the
 * pose the query tests it at, and its bounds at that pose.
 */
export interface QueryCandidate {
  body: CollisionBody;
  bounds: Aabb;
}

/**
 * Reads a broad-phase tree candidate's collider at its simulated pose, the
 * pose every physics query tests a collider at, or returns `null` when the
 * query must skip it.
 *
 * A dynamic or kinematic body is always a root entity, so its `local` is
 * its world pose at the end of the latest fixed step (or wherever game code
 * has since put it), while its `world` is where it's drawn, which outside a
 * fixed step can be up to a step behind. So its collider is read at
 * `local`, with bounds computed from that pose, like the physics queries of
 * other engines read the simulation rather than the drawn frame. Every
 * other collider is never moved by physics, so it's read at its `world`
 * pose with the broad phase's {@link ColliderEcsComponent.aabb}.
 *
 * The trees are as of the broad phase's last run, so an entity in them may
 * have lost its collider or position, or been removed, since. A collider
 * component added since then (replacing the one its proxy was made from)
 * still has the empty box it starts with (`min` at `Infinity`, `max` at
 * `-Infinity`), so it's skipped too: a box with infinite sides would
 * otherwise overlap it.
 * @param entity - The entity the tree's proxy holds.
 * @param accessors - The query's component accessors; see
 * {@link getQueryComponentAccessors}.
 * @param filter - The query's filter.
 * @returns The entity's collider body and bounds, or `null` if it's gone,
 * the filter rejects it, or its `aabb` is still empty.
 */
export function readQueryCandidate(
  entity: number,
  accessors: QueryComponentAccessors,
  filter: PhysicsQueryFilter,
): QueryCandidate | null {
  const collider = accessors.getCollider(entity);
  const position = accessors.getPosition(entity);

  if (
    collider === null ||
    position === null ||
    (collider.category & filter.mask) === 0 ||
    (collider.sensor && !filter.includeSensors)
  ) {
    return null;
  }

  const { min, max } = collider.aabb;

  if (!(min.x <= max.x && min.y <= max.y)) {
    return null;
  }

  const rotation = accessors.getRotation(entity);

  if (isStaticBody(accessors.getRigidBody(entity))) {
    return {
      body: {
        position: position.world,
        rotation: getColliderRotation(rotation),
        collider: collider.collider,
      },
      bounds: collider.aabb,
    };
  }

  const body: CollisionBody = {
    position: position.local,
    rotation: rotation ? rotation.local : 0,
    collider: collider.collider,
  };

  return {
    body,
    bounds: collider.collider.computeAabb(body.position, body.rotation),
  };
}
