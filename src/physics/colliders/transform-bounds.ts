import { Vector2 } from '../../math/index.js';
import { Aabb } from '../types/aabb.js';

/**
 * Transforms a local-space bounding box into world space, as the bounding
 * box of its four transformed corners. Exact when `rotation` is `0`, and
 * slightly larger than the shape's tightest box otherwise, which only adds
 * broad-phase candidates. Chain shapes cache their local bounds and use
 * this, so the broad phase never transforms their (possibly thousands of)
 * points every step.
 * @param bounds - The local-space box.
 * @param position - The entity's world position.
 * @param rotation - The entity's world rotation, in radians.
 * @returns The world-space box, freshly allocated.
 */
export function transformBounds(
  bounds: Aabb,
  position: Vector2,
  rotation: number,
): Aabb {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const centerY = (bounds.min.y + bounds.max.y) / 2;
  const halfWidth = (bounds.max.x - bounds.min.x) / 2;
  const halfHeight = (bounds.max.y - bounds.min.y) / 2;
  const extentX = Math.abs(cos) * halfWidth + Math.abs(sin) * halfHeight;
  const extentY = Math.abs(sin) * halfWidth + Math.abs(cos) * halfHeight;
  const worldCenterX = cos * centerX - sin * centerY + position.x;
  const worldCenterY = sin * centerX + cos * centerY + position.y;

  return {
    min: { x: worldCenterX - extentX, y: worldCenterY - extentY },
    max: { x: worldCenterX + extentX, y: worldCenterY + extentY },
  };
}
