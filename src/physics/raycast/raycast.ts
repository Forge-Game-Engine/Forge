import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { getColliderRotation } from '../collider-rotation.js';
import { ColliderType } from '../colliders/collider.js';
import { aabbsOverlap } from '../collision/aabb-overlap.js';
import {
  allCollisionCategories,
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';
import { Aabb } from '../types/aabb.js';
import { CollisionBody } from '../types/collision-body.js';
import { RaycastHit, RaycastShapeHit } from '../types/raycast-hit.js';
import { raycastChain } from './raycast-chain.js';
import { raycastCircle } from './raycast-circle.js';
import { raycastPolygon } from './raycast-polygon.js';
import { raycastTerrain } from './raycast-terrain.js';
import { withDefaults } from '../../utilities/with-defaults.js';

const raycastDetectors: Record<
  ColliderType,
  (body: CollisionBody, start: Vector2, end: Vector2) => RaycastShapeHit | null
> = {
  circle: raycastCircle,
  polygon: raycastPolygon,
  terrain: raycastTerrain,
  chain: raycastChain,
};

function computeSegmentAabb(start: Vector2, end: Vector2): Aabb {
  return {
    min: { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) },
    max: { x: Math.max(start.x, end.x), y: Math.max(start.y, end.y) },
  };
}

function isMovingBody(rigidBody: RigidBodyEcsComponent | null): boolean {
  return rigidBody !== null && rigidBody.type !== 'static';
}

// The pose a ray tests a collider at: the simulated pose, like the physics
// queries of other engines. A dynamic or kinematic body is always a root
// entity, so its `local` is its world pose at the end of the latest fixed
// step (or wherever game code has since put it). Its `world` is where it's
// drawn, which outside a fixed step can be up to a step behind. Every other
// collider is never moved by physics, so its `world` is its pose.
function getSimulatedBody(
  position: PositionEcsComponent,
  rotation: RotationEcsComponent | null,
  rigidBody: RigidBodyEcsComponent | null,
  collider: ColliderEcsComponent,
): CollisionBody {
  if (isMovingBody(rigidBody)) {
    return {
      position: position.local,
      rotation: rotation ? rotation.local : 0,
      collider: collider.collider,
    };
  }

  return {
    position: position.world,
    rotation: getColliderRotation(rotation),
    collider: collider.collider,
  };
}

/**
 * Options for {@link raycast}.
 */
export interface RaycastOptions {
  /**
   * When `true`, results are ordered by distance from `start`, so the first
   * result is the nearest entity along the ray. Pass `false` to skip the
   * sort if you only need a yes/no check, or intend to find the closest hit
   * yourself. Defaults to `true`.
   */
  sort: boolean;

  /**
   * The collider categories the ray can hit: a collider is tested only if
   * its `category` shares a bit with this mask. Defaults to
   * {@link allCollisionCategories}.
   */
  mask: number;

  /**
   * When `true`, the ray also hits sensor colliders. Defaults to `false`,
   * so a ray aimed at walls passes through trigger zones.
   */
  includeSensors: boolean;
}

const defaultRaycastOptions: RaycastOptions = {
  sort: true,
  mask: allCollisionCategories,
  includeSensors: false,
};

/**
 * Casts a line segment from `start` to `end` against every entity in
 * `world` with a {@link ColliderEcsComponent} and a `PositionEcsComponent`,
 * and returns one hit for each collider it crosses, at the intersection
 * closest to `start`. Use it for hitscan weapons, line-of-sight checks, and
 * ground or wall detection.
 *
 * It tests each collider at its simulated pose. A collider on a `'dynamic'`
 * or `'kinematic'` rigid body is tested at the body's `position.local` and
 * `rotation.local`: its pose at the end of the latest fixed step, or wherever
 * game code has since put it. Bodies are drawn between their last two fixed
 * steps, so a hit on a moving body can be up to one step ahead of where it's
 * drawn. Every other collider is tested at its `world` transform.
 *
 * Before testing an entity's exact collider shape, `raycast` skips any
 * collider whose bounds don't overlap the ray's own bounding box, so casting
 * against a `world` with many entities is cheap as long as most of them
 * aren't near the ray. A moving body's bounds are computed from the pose it's
 * tested at. Every other collider's are its
 * {@link ColliderEcsComponent.aabb}, which `createBroadPhaseEcsSystem`
 * writes, so a static collider added since the broad phase last ran can't
 * be hit yet.
 * @param world - The ECS world to search for collider entities in.
 * @param start - The ray's world-space start point.
 * @param end - The ray's world-space end point.
 * @param options - Sorting and filtering; see {@link RaycastOptions}.
 * @returns A {@link RaycastHit} for each collider the ray crosses.
 */
export function raycast(
  world: EcsWorld,
  start: Vector2,
  end: Vector2,
  options: Partial<RaycastOptions> = {},
): RaycastHit[] {
  const { sort, mask, includeSensors } = withDefaults(
    defaultRaycastOptions,
    options,
  );
  const { entities, components } = world.query<
    [PositionEcsComponent, ColliderEcsComponent]
  >([positionId, colliderId]);
  const [positions, colliders] = components;
  // Rotation is optional for colliders (an entity without one is treated as
  // unrotated), so it's read per entity rather than required by the query.
  const getRotation =
    world.getComponentAccessor<RotationEcsComponent>(rotationId);
  const getRigidBody =
    world.getComponentAccessor<RigidBodyEcsComponent>(rigidBodyId);

  const rayAabb = computeSegmentAabb(start, end);
  const hits: RaycastHit[] = [];

  for (let i = 0; i < entities.length; i++) {
    const collider = colliders[i];

    if (
      (collider.category & mask) === 0 ||
      (collider.sensor && !includeSensors)
    ) {
      continue;
    }

    const rigidBody = getRigidBody(entities[i]);
    const body = getSimulatedBody(
      positions[i],
      getRotation(entities[i]),
      rigidBody,
      collider,
    );
    const bounds = isMovingBody(rigidBody)
      ? collider.collider.computeAabb(body.position, body.rotation)
      : collider.aabb;

    if (!aabbsOverlap(rayAabb, bounds)) {
      continue;
    }

    const hit = raycastDetectors[body.collider.type](body, start, end);

    if (hit !== null) {
      hits.push({ entity: entities[i], ...hit });
    }
  }

  if (sort) {
    hits.sort((a, b) => a.distance - b.distance);
  }

  return hits;
}
