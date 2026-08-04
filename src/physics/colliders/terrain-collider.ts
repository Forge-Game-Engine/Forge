import { Vec2, Vector2 } from '../../math/index.js';
import { Aabb } from '../types/aabb.js';
import { Collider } from './collider.js';
import {
  calculateArea,
  calculateCentroid,
  calculateNormals,
  calculatePolygonMomentOfInertia,
} from './polygon-math.js';

const EPSILON = 1e-9;

/**
 * A single span of ground between two consecutive {@link TerrainCollider}
 * surface points, closed off into a convex quadrilateral by a flat bottom
 * edge. `vertices`/`normals` follow the same winding as `PolygonCollider`:
 * the two surface points followed by their corresponding points on the
 * terrain's flat bottom edge, with outward-facing normals in the same
 * order. All fields are in the terrain's local space.
 */
export interface TerrainSegment {
  /**
   * The segment's four vertices, in local space: the two surface points
   * followed by their corresponding points on the terrain's flat bottom
   * edge.
   */
  vertices: readonly Vector2[];

  /**
   * The segment's four outward-facing edge normals, in local space,
   * corresponding to the edges between consecutive `vertices`.
   */
  normals: readonly Vector2[];

  /**
   * The lesser of the segment's two surface points' x-coordinates. Used to
   * cheaply filter candidate segments before running narrow-phase collision
   * checks against them.
   */
  minX: number;

  /**
   * The greater of the segment's two surface points' x-coordinates.
   */
  maxX: number;
}

/**
 * A static, non-convex 2D ground collider defined by a heightmap: a chain of
 * surface points, ordered left to right, closed off into a solid slab by a
 * flat bottom edge `depth` units below the lowest surface point.
 *
 * Unlike {@link PolygonCollider}, `TerrainCollider` does not re-center its
 * vertices around their centroid - `points` are used exactly as authored, in
 * the collider's own local space, with the owning entity's position acting
 * as a simple translation offset (typically `Vec2.zero`, with the terrain
 * authored directly in world coordinates).
 *
 * Narrow-phase collision against a `TerrainCollider` (see
 * `detectCircleTerrainCollision`/`detectPolygonTerrainCollision`) is
 * resolved per-segment: each pair of consecutive surface points, plus the
 * flat bottom edge, forms a convex quadrilateral ({@link segments}), and the
 * existing circle/polygon narrow-phase routines run against whichever
 * segments overlap the other body's local x-range.
 *
 * `TerrainCollider` is intended for static bodies only - attach it with
 * `addColliderComponent` and no `RigidBodyEcsComponent`. A heightmap has no
 * natural mass distribution to simulate as a moving object.
 */
export class TerrainCollider extends Collider {
  public readonly type = 'terrain';
  public readonly points: readonly Vector2[];
  public readonly depth: number;

  /**
   * The flat bottom edge's y-coordinate, in local space: `depth` units below
   * the lowest of `points`.
   */
  public readonly bottomY: number;

  /**
   * The convex quadrilaterals narrow-phase collision detection tests
   * against, one per consecutive pair of `points`.
   */
  public readonly segments: readonly TerrainSegment[];

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

    const clonedPoints = points.map((point) => Vec2.clone(point));
    const bottomY = Math.max(...clonedPoints.map((point) => point.y)) + depth;
    const silhouette = silhouetteVertices(clonedPoints, bottomY);
    const centroid = calculateCentroid(silhouette);
    // Clone before subtracting: `silhouette`'s surface vertices are the same
    // objects as `clonedPoints`, which becomes `this.points` below, so this
    // must not mutate them.
    const verticesAboutCentroid = silhouette.map((vertex) =>
      Vec2.subtract(Vec2.clone(vertex), centroid),
    );
    const mass = calculateArea(silhouette);
    const momentOfInertia = calculatePolygonMomentOfInertia(
      mass,
      verticesAboutCentroid,
    );

    super(momentOfInertia, mass);

    this.points = clonedPoints;
    this.depth = depth;
    this.bottomY = bottomY;
    this.segments = buildSegments(clonedPoints, bottomY);
  }

  public computeAabb(position: Vector2, rotation: number): Aabb {
    // Clone before transforming: `silhouetteVertices` reuses `this.points`'
    // own vector objects for the surface vertices, so this must not mutate
    // the collider's own stored points.
    const worldVertices = silhouetteVertices(this.points, this.bottomY).map(
      (vertex) =>
        Vec2.add(
          Vec2.rotate(Vec2.add(Vec2.clone(vertex), this.offset), rotation),
          position,
        ),
    );

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const vertex of worldVertices) {
      minX = Math.min(minX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxX = Math.max(maxX, vertex.x);
      maxY = Math.max(maxY, vertex.y);
    }

    return {
      min: Vec2.create(minX, minY),
      max: Vec2.create(maxX, maxY),
    };
  }
}

function silhouetteVertices(
  points: readonly Vector2[],
  bottomY: number,
): Vector2[] {
  const first = points[0];
  const last = points[points.length - 1];

  return [
    ...points,
    Vec2.create(last.x, bottomY),
    Vec2.create(first.x, bottomY),
  ];
}

function buildSegments(
  points: readonly Vector2[],
  bottomY: number,
): TerrainSegment[] {
  const segments: TerrainSegment[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const surfaceLeft = points[i];
    const surfaceRight = points[i + 1];

    const vertices: Vector2[] = [
      surfaceLeft,
      surfaceRight,
      Vec2.create(surfaceRight.x, bottomY),
      Vec2.create(surfaceLeft.x, bottomY),
    ];

    segments.push({
      vertices,
      normals: calculateNormals(vertices),
      minX: surfaceLeft.x,
      maxX: surfaceRight.x,
    });
  }

  return segments;
}
