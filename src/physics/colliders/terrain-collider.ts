import { Vec2, Vector2 } from '../../math/index.js';
import { Aabb } from '../types/aabb.js';
import { createOpenEdgeChain } from './build-edge-chain.js';
import { Collider } from './collider.js';
import { ChainEdge, EdgeChain } from './edge-chain.js';
import { transformBounds } from './transform-bounds.js';

const EPSILON = 1e-9;

/**
 * The world-space faces of the solid slab column directly beneath a single
 * surface edge of a {@link TerrainCollider}, as consumed by volume queries
 * that genuinely care about the terrain's inside (currently only
 * `raycastTerrain`).
 */
export interface TerrainEdgeSlab {
  /**
   * The column's four vertices, wound to a positive signed area like a
   * `PolygonCollider`'s: the edge's two surface points, left to right,
   * followed by their corresponding points on the terrain's flat bottom
   * edge, right to left.
   */
  vertices: Vector2[];

  /**
   * The column's four outward-facing edge normals, corresponding to the
   * edges between consecutive `vertices`.
   */
  normals: Vector2[];
}

/**
 * A static, non-convex 2D ground collider defined by a heightmap: a chain of
 * surface points, ordered left to right, closed off into a solid slab by a
 * flat bottom edge `depth` units below (toward local +y) the lowest surface
 * point. Author the points as the ground's surface in world coordinates,
 * with the entity unrotated, and the ground is below them.
 *
 * Like every collider, `points` are used exactly as authored, in the
 * entity's local space, with the owning entity's position acting as a
 * simple translation (typically `Vec2.zero`, with the terrain authored
 * directly in world coordinates).
 *
 * Narrow-phase collision against a `TerrainCollider` (see
 * `detectCircleTerrainCollision`/`detectPolygonTerrainCollision`) runs
 * against the {@link surface} chain, never against the slab: the slab gives
 * the shape its silhouette and bounding box, decides how far below the
 * surface a body is still pushed back up, and gives `raycastTerrain`
 * something solid to hit. Contact normals therefore always come from the
 * ground's actual surface, and a body straddling several surface edges gets
 * one contact per edge it genuinely touches instead of a single contact
 * that jumps between them.
 *
 * `TerrainCollider` is for static and kinematic bodies only: attach it with
 * `addColliderComponent` and no `RigidBodyEcsComponent` (or a `'static'` or
 * `'kinematic'` one). A heightmap has no natural mass distribution to
 * simulate as a moving object, so its mass data is zero and
 * `getRigidBodyMassData` throws for a `'dynamic'` body that has one.
 */
export class TerrainCollider extends Collider {
  public readonly type = 'terrain';
  public readonly supportsDynamicBodies = false;
  public readonly points: readonly Vector2[];
  public readonly depth: number;

  /**
   * The flat bottom edge's y-coordinate, in local space: `depth` units below
   * the lowest of `points` (`max(points.y) + depth`, since the world is
   * Y-down).
   */
  public readonly bottomY: number;

  /**
   * The open chain of surface edges narrow-phase collision detection tests
   * against, one per consecutive pair of `points`, ordered left to right.
   * Each edge's outward normal points broadly toward local -y, away from
   * the slab.
   */
  public readonly surface: EdgeChain;

  /**
   * The silhouette's bounding box in local space: the surface points and
   * the bottom edge.
   */
  private readonly _localBounds: Aabb;

  /**
   * Creates a new TerrainCollider instance.
   * @param points - The local-space surface points of the terrain, ordered
   * by strictly increasing x. Must contain at least 2 points.
   * @param depth - The thickness of the terrain slab below its lowest
   * point. Must be positive.
   * @throws An error if fewer than 2 points are provided, the points are
   * not ordered by strictly increasing x, or `depth` is not positive.
   */
  constructor(points: readonly Vector2[], depth: number) {
    if (points.length < 2) {
      throw new Error(
        `TerrainCollider requires at least 2 points, received ${points.length}.`,
      );
    }

    for (let i = 0; i < points.length - 1; i++) {
      if (points[i + 1].x <= points[i].x + EPSILON) {
        throw new Error(
          'TerrainCollider points must be ordered by strictly increasing x.',
        );
      }
    }

    if (depth <= 0) {
      throw new Error(
        `TerrainCollider depth must be positive, received "${depth}".`,
      );
    }

    super(0, 0, Vec2.zero);

    const clonedPoints = points.map((point) => Vec2.clone(point));
    const surface = createOpenEdgeChain(clonedPoints);
    const bottomY = surface.bounds.max.y + depth;

    this.points = clonedPoints;
    this.depth = depth;
    this.bottomY = bottomY;
    this.surface = surface;
    this._localBounds = {
      min: { x: surface.bounds.min.x, y: surface.bounds.min.y },
      max: { x: surface.bounds.max.x, y: bottomY },
    };
  }

  public computeAabb(position: Vector2, rotation: number): Aabb {
    return transformBounds(this._localBounds, position, rotation);
  }
}

/**
 * Builds the closed, convex quadrilateral column of solid terrain directly
 * beneath a single surface edge, transformed into world space, for volume
 * queries that need the terrain's inside rather than just its surface.
 *
 * Narrow-phase collision deliberately does *not* use this: a moving body
 * must only ever meet the terrain's surface, never the interior faces two
 * neighboring columns share (see {@link ChainEdge}). A ray, by contrast,
 * can legitimately enter the slab from any direction, so `raycastTerrain`
 * does.
 * @param edge - The surface edge whose column to build.
 * @param bottomY - The terrain's {@link TerrainCollider.bottomY}.
 * @param position - The terrain body's world position.
 * @param rotation - The terrain body's world rotation, in radians.
 * @returns The column's world-space vertices and outward-facing normals,
 * freshly allocated so the caller may transform them further in place.
 */
export function buildTerrainEdgeSlab(
  edge: ChainEdge,
  bottomY: number,
  position: Vector2,
  rotation: number,
): TerrainEdgeSlab {
  const localVertices = [
    edge.start,
    edge.end,
    { x: edge.end.x, y: bottomY },
    { x: edge.start.x, y: bottomY },
  ];

  // The three faces closing the column off below the surface are always
  // axis-aligned in local space - the two sides run straight down to the
  // flat bottom edge - so they never need deriving from the vertices.
  const localNormals = [
    edge.normal,
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  return {
    // Clone before transforming: `edge.start`/`edge.end`/`edge.normal` are
    // the collider's own persistent local-space data, reused every tick.
    vertices: localVertices.map((vertex) =>
      Vec2.add(Vec2.rotate(Vec2.clone(vertex), rotation), position),
    ),
    normals: localNormals.map((normal) =>
      Vec2.rotate(Vec2.clone(normal), rotation),
    ),
  };
}
