// Joins a layer's outline edges into closed loops. Not exported from the
// package.

import { GridLayout, Vector2 } from '../../math/index.js';
import { collisionSnapSteps } from './tile-collision-variant.js';

/**
 * Directed edges in a layer's cell space, in whole snapping steps, each
 * with solid on its right as it's walked on screen. Edge `i` runs from
 * `(startX[i], startY[i])` to `(endX[i], endY[i])`, and lies within one
 * cell.
 */
export interface CollisionEdgeList {
  readonly startX: number[];
  readonly startY: number[];
  readonly endX: number[];
  readonly endY: number[];
}

/**
 * Creates an empty {@link CollisionEdgeList}.
 * @returns The list.
 */
export const createCollisionEdgeList = (): CollisionEdgeList => ({
  startX: [],
  startY: [],
  endX: [],
  endY: [],
});

/**
 * Adds an edge to a list.
 * @param edges - The list.
 * @param startX - The edge's start, in snapping steps.
 * @param startY - The edge's start, in snapping steps.
 * @param endX - The edge's end, in snapping steps.
 * @param endY - The edge's end, in snapping steps.
 */
export const addCollisionEdge = (
  edges: CollisionEdgeList,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): void => {
  edges.startX.push(startX);
  edges.startY.push(startY);
  edges.endX.push(endX);
  edges.endY.push(endY);
};

/** The edges leaving each point, by the point's x and then its y. */
type VertexIndex = Map<number, Map<number, number[]>>;

const indexEdgeStarts = (edges: CollisionEdgeList): VertexIndex => {
  const index: VertexIndex = new Map();

  edges.startX.forEach((x, edge) => {
    const y = edges.startY[edge];
    let column = index.get(x);

    if (!column) {
      column = new Map();
      index.set(x, column);
    }

    const leaving = column.get(y);

    if (leaving) {
      leaving.push(edge);
    } else {
      column.set(y, [edge]);
    }
  });

  return index;
};

/**
 * Ranks a direction's turn from `(dx, dy)`, in `(-π, π]`, a right turn on
 * screen being positive: `0` for a left turn, `1` straight on, `2` a right
 * turn and `3` straight back.
 */
const turnRank = (dx: number, dy: number, ox: number, oy: number): number => {
  const turn = dx * oy - dy * ox;

  if (turn < 0) {
    return 0;
  }

  if (turn > 0) {
    return 2;
  }

  return dx * ox + dy * oy > 0 ? 1 : 3;
};

/**
 * Picks the edge that follows `edge` in its loop: of the edges leaving its
 * end, the one that turns furthest to the right, towards the solid. Where
 * pieces of solid touch at a point, this keeps each piece in a loop of its
 * own.
 */
const findSuccessor = (
  edges: CollisionEdgeList,
  index: VertexIndex,
  edge: number,
): number => {
  const leaving = index.get(edges.endX[edge])?.get(edges.endY[edge]);

  if (!leaving) {
    throw new Error(
      `Unable to build a tilemap's collision outline: no edge leaves (${edges.endX[edge]}, ${edges.endY[edge]}). This is a bug in the engine.`,
    );
  }

  const dx = edges.endX[edge] - edges.startX[edge];
  const dy = edges.endY[edge] - edges.startY[edge];
  let best = leaving[0];

  for (let i = 1; i < leaving.length; i++) {
    const candidate = leaving[i];
    const cx = edges.endX[candidate] - edges.startX[candidate];
    const cy = edges.endY[candidate] - edges.startY[candidate];
    const bx = edges.endX[best] - edges.startX[best];
    const by = edges.endY[best] - edges.startY[best];
    const candidateRank = turnRank(dx, dy, cx, cy);
    const bestRank = turnRank(dx, dy, bx, by);

    // In the same half turn, the candidate turns further right when it's
    // rotated from the best towards +Y.
    if (
      candidateRank > bestRank ||
      (candidateRank === bestRank && bx * cy - by * cx > 0)
    ) {
      best = candidate;
    }
  }

  return best;
};

/** Follows successors from every unvisited edge, giving each loop's edges in order. */
const traceLoops = (
  edges: CollisionEdgeList,
  index: VertexIndex,
): number[][] => {
  const count = edges.startX.length;
  const visited = new Uint8Array(count);
  const loops: number[][] = [];

  for (let first = 0; first < count; first++) {
    if (visited[first]) {
      continue;
    }

    const loop: number[] = [];
    let edge = first;

    while (!visited[edge]) {
      visited[edge] = 1;
      loop.push(edge);
      edge = findSuccessor(edges, index, edge);
    }

    if (edge !== first) {
      throw new Error(
        'Unable to build a tilemap’s collision outline: its edges don’t form closed loops. This is a bug in the engine.',
      );
    }

    loops.push(loop);
  }

  return loops;
};

/**
 * The loop's vertices with straight runs merged: a vertex is dropped when
 * its two edges point the same way and no other loop passes through it, so
 * no loop's vertex ends up inside another loop's edge.
 */
const mergeStraightRuns = (
  edges: CollisionEdgeList,
  index: VertexIndex,
  loop: readonly number[],
): SnappedVertex[] => {
  const vertices: SnappedVertex[] = [];

  loop.forEach((edge, position) => {
    const previous = loop[(position - 1 + loop.length) % loop.length];
    const x = edges.startX[edge];
    const y = edges.startY[edge];
    const inX = x - edges.startX[previous];
    const inY = y - edges.startY[previous];
    const outX = edges.endX[edge] - x;
    const outY = edges.endY[edge] - y;
    const isStraight =
      inX * outY - inY * outX === 0 && inX * outX + inY * outY > 0;
    const isShared = (index.get(x)?.get(y)?.length ?? 0) > 1;

    if (!isStraight || isShared) {
      vertices.push({ x, y });
    }
  });

  return vertices;
};

interface SnappedVertex {
  readonly x: number;
  readonly y: number;
}

/** Orders vertices by `y`, then `x`. */
const compareVertices = (a: SnappedVertex, b: SnappedVertex): number =>
  a.y - b.y || a.x - b.x;

/** Rotates a loop to start at its smallest vertex. */
const startAtSmallestVertex = (
  vertices: readonly SnappedVertex[],
): SnappedVertex[] => {
  let smallest = 0;

  for (let i = 1; i < vertices.length; i++) {
    if (compareVertices(vertices[i], vertices[smallest]) < 0) {
      smallest = i;
    }
  }

  return [...vertices.slice(smallest), ...vertices.slice(0, smallest)];
};

/**
 * Joins a layer's outline edges into closed loops in the layer's local
 * space, with straight runs merged, in an order that only depends on the
 * edges, not on the order they were added.
 * @param edges - The outline's edges. Every point must have as many edges
 * arriving as leaving, as the edges of a union of shapes do.
 * @param layout - The layout that maps cell space back to local space.
 * @returns The loops, each with solid on the right of its edges: positive
 * signed area around solid and negative around holes.
 */
export const linkCollisionLoops = (
  edges: CollisionEdgeList,
  layout: GridLayout,
): Vector2[][] => {
  const index = indexEdgeStarts(edges);
  const loops = traceLoops(edges, index)
    .map((loop) => startAtSmallestVertex(mergeStraightRuns(edges, index, loop)))
    .sort((a, b) => compareVertices(a[0], b[0]) || compareVertices(a[1], b[1]));

  // Dividing by a power of two is exact, and a vertex two loops share is
  // one pair of integers, so it maps to the same point in both.
  return loops.map((loop) =>
    loop.map((vertex) =>
      layout.cellSpaceToLocal({
        x: vertex.x / collisionSnapSteps,
        y: vertex.y / collisionSnapSteps,
      }),
    ),
  );
};
