import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { aabbsOverlap } from '../collision/aabb-overlap.js';
import { AabbEcsComponent, aabbId } from '../components/aabb-component.js';
import {
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
 * Casts a line segment from `start` to `end` against every entity in
 * `world` with a {@link ColliderEcsComponent}, and returns every point where
 * it intersects one. Use it for hitscan weapons, line-of-sight checks, and
 * ground/wall detection - anything that needs to ask "what's between these
 * two points?" without running a full simulation step.
 *
 * Before testing an entity's exact collider shape, `raycast` skips any
 * entity whose {@link AabbEcsComponent} doesn't overlap the ray's own
 * bounding box, so casting against a `world` with many entities is cheap as
 * long as most of them aren't near the ray.
 * @param world - The ECS world to search for collider entities in.
 * @param start - The ray's world-space start point.
 * @param end - The ray's world-space end point.
 * @param sort - When `true` (the default), results are ordered by distance
 * from `start`, so the first result is the nearest entity along the ray.
 * Pass `false` to skip the sort if you only need a yes/no check, or intend
 * to find the closest hit yourself.
 * @returns Every entity the ray intersects, as a {@link RaycastHit}.
 */
export function raycast(
  world: EcsWorld,
  start: Vector2,
  end: Vector2,
  sort: boolean = true,
): RaycastHit[] {
  const { entities, components } = world.query<
    [
      PositionEcsComponent,
      RotationEcsComponent,
      ColliderEcsComponent,
      AabbEcsComponent,
    ]
  >([positionId, rotationId, colliderId, aabbId]);
  const [positions, rotations, colliders, aabbs] = components;

  const rayAabb = computeSegmentAabb(start, end);
  const hits: RaycastHit[] = [];

  for (let i = 0; i < entities.length; i++) {
    if (!aabbsOverlap(rayAabb, aabbs[i])) {
      continue;
    }

    const body: CollisionBody = {
      position: positions[i].world,
      rotation: rotations[i].world,
      collider: colliders[i].collider,
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
