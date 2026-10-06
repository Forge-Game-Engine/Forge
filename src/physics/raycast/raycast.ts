import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { getColliderRotation } from '../collider-rotation.js';
import { aabbsOverlap } from '../collision/aabb-overlap.js';
import {
  allCollisionCategories,
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import { Aabb } from '../types/aabb.js';
import { CollisionBody } from '../types/collision-body.js';
import { RaycastHit, RaycastShapeHit } from '../types/raycast-hit.js';
import { raycastCircle } from './raycast-circle.js';
import { raycastPolygon } from './raycast-polygon.js';
import { raycastTerrain } from './raycast-terrain.js';

const raycastDetectors = new Map<
  string,
  (body: CollisionBody, start: Vector2, end: Vector2) => RaycastShapeHit | null
>([
  ['circle', raycastCircle],
  ['polygon', raycastPolygon],
  ['terrain', raycastTerrain],
]);

function raycastBody(
  body: CollisionBody,
  start: Vector2,
  end: Vector2,
): RaycastShapeHit | null {
  const detector = raycastDetectors.get(body.collider.type);

  if (!detector) {
    throw new Error(
      `No raycast detector registered for collider type "${body.collider.type}".`,
    );
  }

  return detector(body, start, end);
}

function computeSegmentAabb(start: Vector2, end: Vector2): Aabb {
  return {
    min: { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) },
    max: { x: Math.max(start.x, end.x), y: Math.max(start.y, end.y) },
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
 * `world` with a {@link ColliderEcsComponent}, and returns every point where
 * it intersects one. Use it for hitscan weapons, line-of-sight checks, and
 * ground/wall detection - anything that needs to ask "what's between these
 * two points?" without running a full simulation step.
 *
 * Before testing an entity's exact collider shape, `raycast` skips any
 * collider whose {@link ColliderEcsComponent.aabb} doesn't overlap the
 * ray's own bounding box, so casting against a `world` with many entities
 * is cheap as long as most of them aren't near the ray. Those bounds are
 * written by `createBroadPhaseEcsSystem`, so a collider added since the
 * broad phase last ran can't be hit yet.
 * @param world - The ECS world to search for collider entities in.
 * @param start - The ray's world-space start point.
 * @param end - The ray's world-space end point.
 * @param options - Sorting and filtering; see {@link RaycastOptions}.
 * @returns Every entity the ray intersects, as a {@link RaycastHit}.
 */
export function raycast(
  world: EcsWorld,
  start: Vector2,
  end: Vector2,
  options: Partial<RaycastOptions> = {},
): RaycastHit[] {
  const { sort, mask, includeSensors } = {
    ...defaultRaycastOptions,
    ...options,
  };
  const { entities, components } = world.query<
    [PositionEcsComponent, ColliderEcsComponent]
  >([positionId, colliderId]);
  const [positions, colliders] = components;
  // Rotation is optional for colliders (an entity without one is treated as
  // unrotated), so it's read per entity rather than required by the query.
  const getRotation =
    world.getComponentAccessor<RotationEcsComponent>(rotationId);

  const rayAabb = computeSegmentAabb(start, end);
  const hits: RaycastHit[] = [];

  for (let i = 0; i < entities.length; i++) {
    const collider = colliders[i];

    if (
      (collider.category & mask) === 0 ||
      (collider.sensor && !includeSensors) ||
      !aabbsOverlap(rayAabb, collider.aabb)
    ) {
      continue;
    }

    const body: CollisionBody = {
      position: positions[i].world,
      rotation: getColliderRotation(getRotation(entities[i])),
      collider: collider.collider,
    };
    const hit = raycastBody(body, start, end);

    if (hit !== null) {
      hits.push({ entity: entities[i], ...hit });
    }
  }

  if (sort) {
    hits.sort((a, b) => a.distance - b.distance);
  }

  return hits;
}
