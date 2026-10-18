import { Vec2, Vector2 } from '../../math/index.js';
import { Aabb } from '../types/aabb.js';
import { ChainEdge, EdgeChain } from './edge-chain.js';
import { EdgeTree } from './edge-tree.js';

/**
 * Builds an open chain through `points`, as a `TerrainCollider`'s surface:
 * edge `i` runs from point `i` to point `i + 1`, the first edge has no
 * `previous` and the last has no `next`.
 * @param points - The chain's points, in order. They're aliased by the
 * edges, not copied, so the caller must never mutate them afterwards.
 * Must contain at least 2 points.
 * @returns The chain.
 */
export function createOpenEdgeChain(points: readonly Vector2[]): EdgeChain {
  const edges: ChainEdge[] = [];
  const lastEdge = points.length - 2;

  for (let i = 0; i <= lastEdge; i++) {
    edges.push(
      createEdge(
        points[i],
        points[i + 1],
        i > 0 ? i - 1 : null,
        i < lastEdge ? i + 1 : null,
        i,
        i + 1,
      ),
    );
  }

  return createEdgeChain(edges, points.length, points);
}

/**
 * Builds one closed chain per loop, numbered loop after loop: loop `k`'s
 * edge `i` runs from its point `i` to its point `i + 1` (wrapping back to
 * its first point), and each edge's neighbors are the edges before and
 * after it in its own loop.
 * @param loops - The loops' points, in order, without repeating a loop's
 * first point at its end. They're aliased by the edges, not copied, so the
 * caller must never mutate them afterwards. Each loop must contain at
 * least 3 points.
 * @returns The chain.
 */
export function createClosedEdgeChain(
  loops: readonly (readonly Vector2[])[],
): EdgeChain {
  const edges: ChainEdge[] = [];

  for (const loop of loops) {
    const offset = edges.length;
    const count = loop.length;

    for (let i = 0; i < count; i++) {
      const nextIndex = (i + 1) % count;

      edges.push(
        createEdge(
          loop[i],
          loop[nextIndex],
          offset + ((i - 1 + count) % count),
          offset + nextIndex,
          offset + i,
          offset + nextIndex,
        ),
      );
    }
  }

  return createEdgeChain(edges, edges.length, loops.flat());
}

function createEdge(
  start: Vector2,
  end: Vector2,
  previous: number | null,
  next: number | null,
  startVertex: number,
  endVertex: number,
): ChainEdge {
  // Clone before subtracting: `start`/`end` are the collider's own stored
  // points, which this must not mutate. `perpendicular` turns the edge from
  // `+X` towards `-Y`, which points away from solid for a loop around solid
  // (positive signed area), a loop around a hole (negative signed area) and
  // a terrain surface ordered by increasing x alike.
  const normal = Vec2.normalize(
    Vec2.perpendicular(Vec2.subtract(Vec2.clone(end), start)),
  );

  return { start, end, normal, previous, next, startVertex, endVertex };
}

function createEdgeChain(
  edges: readonly ChainEdge[],
  vertexCount: number,
  points: readonly Vector2[],
): EdgeChain {
  const tree = new EdgeTree(
    edges.map((edge) => boundsOf([edge.start, edge.end])),
  );

  return {
    edges,
    vertexCount,
    bounds: boundsOf(points),
    queryEdges: (bounds) => tree.queryBounds(bounds),
    queryEdgesAlongSegment: (start, end) => tree.querySegment(start, end),
  };
}

function boundsOf(points: readonly Vector2[]): Aabb {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}
