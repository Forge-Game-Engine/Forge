import { Vector2 } from '../../math/index.js';
import { ChainCollider } from '../colliders/chain-collider.js';
import { ChainEdge } from '../colliders/edge-chain.js';
import { toChainLocal } from '../collision/edge-chain-contacts.js';
import { CollisionBody } from '../types/collision-body.js';

/**
 * Checks whether a chain-collider body contains a world-space point: the
 * point is on one of the chain's edges, or inside its solid. A loop with
 * positive signed area surrounds solid and one with negative signed area
 * surrounds a hole, so the solid is decided by winding: the point is inside
 * when the loops wind around it at least once, or at least zero times when
 * the outside of every loop is solid ({@link ChainCollider.outsideIsSolid}).
 * Navigation baking marks a chain's solid by the same rule.
 *
 * Bodies only collide with a chain's edges, from the side their normals
 * face, so a body inside the solid isn't pushed out of it, but the point
 * query still reports a point there as inside.
 * @param chainBody - The body with a {@link ChainCollider}.
 * @param point - The world-space point.
 * @returns `true` if the point is inside the chain's solid or on an edge,
 * and `false` for a chain with no loops.
 */
export function containsPointChain(
  chainBody: CollisionBody,
  point: Vector2,
): boolean {
  const { outline, outsideIsSolid } = chainBody.collider as ChainCollider;

  if (outline.edges.length === 0) {
    return false;
  }

  const local = toChainLocal(point, chainBody);

  // On the boundary counts as inside, as it does for every other shape.
  for (const edgeIndex of outline.queryEdges({ min: local, max: local })) {
    if (isOnEdge(outline.edges[edgeIndex], local)) {
      return true;
    }
  }

  // Winding along a horizontal ray from the point towards -X. An edge going
  // up the screen (towards -Y) adds 1 to every point to its right, and one
  // going down subtracts 1.
  let winding = 0;

  for (const edgeIndex of outline.queryEdges({
    min: { x: -Infinity, y: local.y },
    max: local,
  })) {
    const { start, end } = outline.edges[edgeIndex];

    // Half-open in y, so a vertex on the ray's line is counted once and a
    // horizontal edge never.
    if (
      local.y < Math.min(start.y, end.y) ||
      local.y >= Math.max(start.y, end.y)
    ) {
      continue;
    }

    const crossingX =
      start.x + ((local.y - start.y) * (end.x - start.x)) / (end.y - start.y);

    if (crossingX < local.x) {
      winding += start.y > end.y ? 1 : -1;
    }
  }

  return winding >= (outsideIsSolid ? 0 : 1);
}

/**
 * Returns whether a local-space point lies exactly on an edge's segment.
 */
function isOnEdge(edge: ChainEdge, point: Vector2): boolean {
  const { start, end } = edge;
  const cross =
    (end.x - start.x) * (point.y - start.y) -
    (end.y - start.y) * (point.x - start.x);

  return (
    cross === 0 &&
    point.x >= Math.min(start.x, end.x) &&
    point.x <= Math.max(start.x, end.x) &&
    point.y >= Math.min(start.y, end.y) &&
    point.y <= Math.max(start.y, end.y)
  );
}
