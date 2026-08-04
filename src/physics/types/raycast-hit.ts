import { Vector2 } from '../../math/index.js';

/**
 * A single point where a ray intersected a collider shape, in world space.
 */
export interface RaycastShapeHit {
  /**
   * The world-space point where the ray intersected the shape.
   */
  point: Vector2;

  /**
   * The shape's outward-facing surface normal at `point`, in world space.
   */
  normal: Vector2;

  /**
   * The distance from the ray's start point to `point`.
   */
  distance: number;
}

/**
 * A single point where a ray intersected an entity's collider, as returned
 * by {@link raycast}.
 */
export interface RaycastHit extends RaycastShapeHit {
  /**
   * The entity the ray hit.
   */
  entity: number;
}
