// Convexity checks and convex polygon clipping, for tile collision shapes.
// Not exported from the package.

import type { Vector2 } from '../../../math/index.js';

const cross = (origin: Vector2, a: Vector2, b: Vector2): number =>
  (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);

/**
 * Whether a polygon is convex: every corner turns the same way, and it
 * turns once around, so it doesn't cross itself. Straight corners are
 * allowed.
 * @param points - The polygon's points, in either winding.
 * @returns Whether it's convex with a non-zero area.
 */
export const isConvexPolygon = (points: readonly Vector2[]): boolean => {
  let sign = 0;
  let turning = 0;

  for (let index = 0; index < points.length; index++) {
    const previous = points[(index + points.length - 1) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const turn = cross(previous, current, next);

    if (turn !== 0) {
      if (sign !== 0 && Math.sign(turn) !== sign) {
        return false;
      }

      sign = Math.sign(turn);
    }

    const incoming = Math.atan2(current.y - previous.y, current.x - previous.x);
    const outgoing = Math.atan2(next.y - current.y, next.x - current.x);
    let angle = outgoing - incoming;

    if (angle > Math.PI) {
      angle -= 2 * Math.PI;
    } else if (angle < -Math.PI) {
      angle += 2 * Math.PI;
    }

    turning += angle;
  }

  // A convex polygon turns through one full circle; a star that turns the
  // same way at every corner turns through two or more.
  return sign !== 0 && Math.abs(Math.abs(turning) - 2 * Math.PI) < 1e-6;
};

const intersect = (
  from: Vector2,
  to: Vector2,
  edgeStart: Vector2,
  edgeEnd: Vector2,
): Vector2 => {
  const fromSide = cross(edgeStart, edgeEnd, from);
  const toSide = cross(edgeStart, edgeEnd, to);
  const t = fromSide / (fromSide - toSide);

  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
};

/**
 * Clips a convex polygon to a convex region with Sutherland-Hodgman, which
 * keeps a convex polygon convex.
 * @param subject - The polygon to clip, convex, in either winding.
 * @param region - The region to keep, convex, with positive signed area
 * (clockwise on screen).
 * @returns The part of `subject` inside `region`, possibly empty.
 */
export const clipConvexPolygon = (
  subject: readonly Vector2[],
  region: readonly Vector2[],
): Vector2[] => {
  let output: Vector2[] = [...subject];

  for (let edge = 0; edge < region.length && output.length > 0; edge++) {
    const edgeStart = region[edge];
    const edgeEnd = region[(edge + 1) % region.length];
    const input = output;

    output = [];

    for (let index = 0; index < input.length; index++) {
      const current = input[index];
      const previous = input[(index + input.length - 1) % input.length];
      const currentInside = cross(edgeStart, edgeEnd, current) >= 0;
      const previousInside = cross(edgeStart, edgeEnd, previous) >= 0;

      if (currentInside !== previousInside) {
        output.push(intersect(previous, current, edgeStart, edgeEnd));
      }

      if (currentInside) {
        output.push(current);
      }
    }
  }

  return output;
};
