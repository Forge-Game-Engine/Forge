import { Vec2, Vector2 } from '../../math/index.js';
import { Aabb } from '../types/aabb.js';
import { createClosedEdgeChain } from './build-edge-chain.js';
import { Collider } from './collider.js';
import { EdgeChain } from './edge-chain.js';
import { calculateSignedArea } from './polygon-math.js';
import { transformBounds } from './transform-bounds.js';

/**
 * Below this distance two points count as the same point, and below this
 * signed area a loop counts as having none.
 */
const EPSILON = 1e-9;

/**
 * How close, as a fraction of an edge's length, an intersection must be to
 * an endpoint to count as that endpoint.
 */
const PARAMETER_EPSILON = 1e-9;

/**
 * A static outline collider for level geometry: any number of closed loops of
 * points in the entity's local space, such as the outline of a tile layer's
 * solid tiles.
 *
 * A loop with positive signed area (as `calculateSignedArea` computes it:
 * its points turn from `+X` towards `+Y`, which is clockwise on screen)
 * surrounds solid, and one with negative signed area surrounds a hole in
 * solid, such as a room. Either way, every edge's outward normal points
 * away from solid. A hole loop needs no loop around it: on its own it
 * describes a room in unbounded solid.
 *
 * Bodies collide only with the edges, from the side their normals face,
 * and each edge's neighbors in its loop act as its "ghost" edges (see
 * `ChainEdge`), so a body sliding along a floor made of many edges never
 * catches on the corners where they meet. A body whose center is behind an
 * edge isn't pushed by it, so a body inside solid isn't pushed out, and
 * walls thinner than a body never push it both ways at once.
 *
 * The collider builds a tree over its edges, so collision detection,
 * raycasts and sweeps only visit the edges near the other shape: a whole
 * level's outline can be one collider on one entity.
 *
 * `ChainCollider` is for static and kinematic bodies only: attach it with
 * `addColliderComponent` and no `RigidBodyEcsComponent` (or a `'static'` or
 * `'kinematic'` one). An outline has no mass distribution, so its mass data
 * is zero and `getRigidBodyMassData` throws for a `'dynamic'` body that has
 * one. Two chain or terrain colliders never collide with each other.
 */
export class ChainCollider extends Collider {
  public readonly type = 'chain';
  public readonly supportsDynamicBodies = false;

  /**
   * The loops, cloned from the constructor's argument, in the entity's
   * local space.
   */
  public readonly loops: readonly (readonly Vector2[])[];

  /**
   * The loops' edges, loop after loop: loop `k`'s edge `i` runs from its
   * point `i` to its point `i + 1`, wrapping back to its first point.
   */
  public readonly outline: EdgeChain;

  /**
   * Creates a new ChainCollider instance.
   * @param loops - The closed loops, in the entity's local space, each
   * wound with positive signed area around solid and negative signed area
   * around a hole. Don't repeat a loop's first point at its end.
   * An empty list is valid: the collider has no edges and collides with
   * nothing, as a tile layer with no solid tiles does.
   * @throws An error if a loop has fewer than 3 points,
   * two consecutive points of a loop (including its last and first) are the
   * same, a loop has zero signed area, or two edges cross or overlap
   * anywhere but at a point that is a vertex of both.
   */
  constructor(loops: readonly (readonly Vector2[])[]) {
    loops.forEach(validateLoop);

    super(0, 0, Vec2.zero);

    const clonedLoops = loops.map((loop) =>
      loop.map((point) => Vec2.clone(point)),
    );

    this.loops = clonedLoops;
    this.outline = createClosedEdgeChain(clonedLoops);

    validateNoCrossings(this.outline, clonedLoops);
  }

  public computeAabb(position: Vector2, rotation: number): Aabb {
    // With no edges the bounds are empty (an infinite min and a negative
    // infinite max), which transformBounds would turn into NaN. The empty
    // box overlaps nothing, so the broad phase never pairs the collider.
    if (this.outline.edges.length === 0) {
      return {
        min: { x: Infinity, y: Infinity },
        max: { x: -Infinity, y: -Infinity },
      };
    }

    return transformBounds(this.outline.bounds, position, rotation);
  }
}

function validateLoop(loop: readonly Vector2[], loopIndex: number): void {
  if (loop.length < 3) {
    throw new Error(
      `ChainCollider loop ${loopIndex} requires at least 3 points, received ${loop.length}.`,
    );
  }

  for (let i = 0; i < loop.length; i++) {
    const nextIndex = (i + 1) % loop.length;

    if (Vec2.distanceTo(loop[i], loop[nextIndex]) < EPSILON) {
      throw new Error(
        nextIndex === 0
          ? `ChainCollider loop ${loopIndex}'s last point (${i}) is the same as its first. Loops close themselves; don't repeat the first point at the end.`
          : `ChainCollider loop ${loopIndex} has the same point at indices ${i} and ${nextIndex}.`,
      );
    }
  }

  if (Math.abs(calculateSignedArea(loop)) < EPSILON) {
    throw new Error(
      `ChainCollider loop ${loopIndex} has zero area: its points are collinear.`,
    );
  }
}

/**
 * The relationship between two edges' segments.
 */
type SegmentIntersection = 'none' | 'shared-vertex' | 'crossing';

/**
 * Throws if two edges of the chain cross or overlap anywhere but at a point
 * that is a vertex of both, which would leave the chain's solid and its
 * holes ill-defined. Loops may still touch at a shared vertex, as tile
 * outlines do where two solid tiles meet only at a corner.
 */
function validateNoCrossings(
  chain: EdgeChain,
  loops: readonly (readonly Vector2[])[],
): void {
  const { edges } = chain;

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const candidates = chain.queryEdges({
      min: {
        x: Math.min(edge.start.x, edge.end.x),
        y: Math.min(edge.start.y, edge.end.y),
      },
      max: {
        x: Math.max(edge.start.x, edge.end.x),
        y: Math.max(edge.start.y, edge.end.y),
      },
    });

    for (const j of candidates) {
      if (j <= i) {
        continue;
      }

      const other = edges[j];
      const isNeighbor = j === edge.previous || j === edge.next;
      const intersection = isNeighbor
        ? classifyNeighbors(edge.start, edge.end, other.start, other.end)
        : classifySegments(edge.start, edge.end, other.start, other.end);

      if (intersection === 'crossing') {
        throw new Error(
          `ChainCollider edges ${describeEdge(loops, i)} and ${describeEdge(loops, j)} cross or overlap. Edges may only meet at a point that is a vertex of both.`,
        );
      }
    }
  }
}

/**
 * Classifies two edges that share a vertex by construction: they only
 * overlap if the second turns straight back along the first.
 */
function classifyNeighbors(
  startA: Vector2,
  endA: Vector2,
  startB: Vector2,
  endB: Vector2,
): SegmentIntersection {
  const directionA = Vec2.subtract(Vec2.clone(endA), startA);
  const directionB = Vec2.subtract(Vec2.clone(endB), startB);
  const lengths = Vec2.magnitude(directionA) * Vec2.magnitude(directionB);

  return Math.abs(Vec2.cross(directionA, directionB)) <=
    PARAMETER_EPSILON * lengths && Vec2.dot(directionA, directionB) < 0
    ? 'crossing'
    : 'shared-vertex';
}

/**
 * Classifies how the segments `startA`-`endA` and `startB`-`endB` meet.
 */
function classifySegments(
  startA: Vector2,
  endA: Vector2,
  startB: Vector2,
  endB: Vector2,
): SegmentIntersection {
  // Clone before subtracting: the points are the collider's own data.
  const directionA = Vec2.subtract(Vec2.clone(endA), startA);
  const directionB = Vec2.subtract(Vec2.clone(endB), startB);
  const startOffset = Vec2.subtract(Vec2.clone(startB), startA);
  const denominator = Vec2.cross(directionA, directionB);
  const lengths = Vec2.magnitude(directionA) * Vec2.magnitude(directionB);

  if (Math.abs(denominator) <= PARAMETER_EPSILON * lengths) {
    return classifyParallelSegments(directionA, directionB, startOffset);
  }

  const tA = Vec2.cross(startOffset, directionB) / denominator;
  const tB = Vec2.cross(startOffset, directionA) / denominator;

  if (!isWithinSegment(tA) || !isWithinSegment(tB)) {
    return 'none';
  }

  return isAtEndpoint(tA) && isAtEndpoint(tB) ? 'shared-vertex' : 'crossing';
}

function classifyParallelSegments(
  directionA: Vector2,
  directionB: Vector2,
  startOffset: Vector2,
): SegmentIntersection {
  const lengthA = Vec2.magnitude(directionA);

  if (Math.abs(Vec2.cross(startOffset, directionA)) > EPSILON * lengthA) {
    return 'none';
  }

  // Collinear: find where B's endpoints fall along A, as fractions of A.
  const lengthSquaredA = lengthA * lengthA;
  const t0 = Vec2.dot(startOffset, directionA) / lengthSquaredA;
  const t1 = t0 + Vec2.dot(directionB, directionA) / lengthSquaredA;
  const overlapStart = Math.max(0, Math.min(t0, t1));
  const overlapEnd = Math.min(1, Math.max(t0, t1));

  if (overlapEnd - overlapStart > PARAMETER_EPSILON) {
    return 'crossing';
  }

  if (overlapEnd - overlapStart < -PARAMETER_EPSILON) {
    return 'none';
  }

  // They touch at a single point, which is an end of A; it's a shared
  // vertex only if it's an end of B too.
  return isAtEndpoint(t0) || isAtEndpoint(t1) ? 'shared-vertex' : 'crossing';
}

function isWithinSegment(t: number): boolean {
  return t >= -PARAMETER_EPSILON && t <= 1 + PARAMETER_EPSILON;
}

function isAtEndpoint(t: number): boolean {
  return (
    Math.abs(t) <= PARAMETER_EPSILON || Math.abs(t - 1) <= PARAMETER_EPSILON
  );
}

function describeEdge(
  loops: readonly (readonly Vector2[])[],
  edgeIndex: number,
): string {
  let remaining = edgeIndex;

  for (let loopIndex = 0; loopIndex < loops.length; loopIndex++) {
    const count = loops[loopIndex].length;

    if (remaining < count) {
      return `(loop ${loopIndex}, points ${remaining} to ${(remaining + 1) % count})`;
    }

    remaining -= count;
  }

  return `${edgeIndex}`;
}
