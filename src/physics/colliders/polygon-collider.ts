import { Vector2 } from '../../math';
import type { Collider } from './collider';

/**
 * The `PolygonCollider` class represents a polygonal collider defined by an array of points.
 * It provides methods to check containment, combine with other colliders, and calculate bounding boxes.
 */
export class PolygonCollider implements Collider {
  /** The points defining the polygon */
  public points: Vector2[];

  /**
   * Creates a new instance of the `PolygonCollider` class.
   * @param points - The points defining the polygon.
   */
  constructor(points: Vector2[]) {
    if (points.length < 3) {
      throw new Error('PolygonCollider requires at least 3 points');
    }

    this.points = points;
  }

  /**
   * Gets the minimum x-coordinate of the polygon.
   * @returns The minimum x-coordinate.
   */
  get minX(): number {
    let min = Number.MAX_SAFE_INTEGER;

    for (const point of this.points) {
      if (point.x < min) {
        min = point.x;
      }
    }

    return min;
  }

  /**
   * Gets the maximum x-coordinate of the polygon.
   * @returns The maximum x-coordinate.
   */
  get maxX(): number {
    let max = Number.MIN_SAFE_INTEGER;

    for (const point of this.points) {
      if (point.x > max) {
        max = point.x;
      }
    }

    return max;
  }

  /**
   * Gets the minimum y-coordinate of the polygon.
   * @returns The minimum y-coordinate.
   */
  get minY(): number {
    let min = Number.MAX_SAFE_INTEGER;

    for (const point of this.points) {
      if (point.y < min) {
        min = point.y;
      }
    }

    return min;
  }

  /**
   * Gets the maximum y-coordinate of the polygon.
   * @returns The maximum y-coordinate.
   */
  get maxY(): number {
    let max = Number.MIN_SAFE_INTEGER;

    for (const point of this.points) {
      if (point.y > max) {
        max = point.y;
      }
    }

    return max;
  }

  /**
   * Checks if a point lies inside this polygon using the winding number algorithm.
   * @param point - The point to check.
   * @returns `true` if the point is within the polygon, `false` otherwise.
   */
  public contains(point: Vector2): boolean {
    let windingNumber = 0;
    const n = this.points.length;

    for (let i = 0; i < n; i++) {
      const current = this.points[i]!;
      const next = this.points[(i + 1) % n]!;

      // Check if the ray from 'point' crosses this edge
      if (current.y <= point.y) {
        if (next.y > point.y) {
          // Potentially an upward crossing
          if (this._isLeft(current, next, point) > 0) {
            ++windingNumber;
          }
        }
      } else {
        if (next.y <= point.y) {
          // Potentially a downward crossing
          if (this._isLeft(current, next, point) < 0) {
            --windingNumber;
          }
        }
      }
    }

    // If the winding number is nonzero, the point is inside
    return windingNumber !== 0;
  }

  /**
   * Combines (unions) this polygon with another polygon by taking the convex hull of all points.
   * @param other - The other polygon collider to combine with.
   * @returns A new `PolygonCollider` representing the combined bounding polygon.
   */
  public combine(other: PolygonCollider): PolygonCollider {
    const allPoints = [...this.points, ...other.points];
    const hull = this._computeConvexHull(allPoints);
    return new PolygonCollider(hull);
  }

  /**
   * Combines (unions) this polygon with multiple polygons by taking the convex hull of all points.
   * @param others - An array of other polygon colliders to combine with.
   * @returns A new `PolygonCollider` representing the combined bounding polygon.
   */
  public combineAll(others: PolygonCollider[]): PolygonCollider {
    let allPoints = [...this.points];
    for (const pc of others) {
      allPoints = allPoints.concat(pc.points);
    }
    const hull = this._computeConvexHull(allPoints);
    return new PolygonCollider(hull);
  }

  /**
   * Returns > 0 if 'point2' is left of the directed segment (point0 -> point1).
   * Returns = 0 if 'point2' is exactly on the line.
   * Returns < 0 otherwise.
   * @param point0 - The starting point of the segment.
   * @param point1 - The ending point of the segment.
   * @param point2 - The point to check.
   * @returns A number indicating the relative position of `point2`.
   */
  private _isLeft(point0: Vector2, point1: Vector2, point2: Vector2): number {
    return (
      (point1.x - point0.x) * (point2.y - point0.y) -
      (point2.x - point0.x) * (point1.y - point0.y)
    );
  }

  /**
   * Computes the convex hull of a set of points using the Monotone Chain algorithm.
   * @param points - The points to compute the convex hull for.
   * @returns An array of points representing the convex hull.
   */
  private _computeConvexHull(points: Vector2[]): Vector2[] {
    if (points.length < 3) {
      // With fewer than 3 points, the hull is just the set of points itself.
      return points;
    }

    // Sort points primarily by x ascending, secondarily by y ascending
    points = points
      .slice()
      .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

    const lower: Vector2[] = [];

    for (const p of points) {
      while (
        lower.length >= 2 &&
        this._cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0
      ) {
        lower.pop();
      }
      lower.push(p);
    }

    const upper: Vector2[] = [];
    for (let i = points.length - 1; i >= 0; i--) {
      const point = points[i]!;

      while (
        upper.length >= 2 &&
        this._cross(
          upper[upper.length - 2]!,
          upper[upper.length - 1]!,
          point,
        ) <= 0
      ) {
        upper.pop();
      }
      upper.push(point);
    }

    // Remove the last element of each list because it's the starting point of the other list
    lower.pop();
    upper.pop();

    // The hull is the concatenation of lower and upper
    return lower.concat(upper);
  }

  /**
   * Cross product of vectors (p1 -> p2) x (p1 -> p3).
   * @param p1 - The starting point of the first vector.
   * @param p2 - The ending point of the first vector.
   * @param p3 - The ending point of the second vector.
   * @returns The cross product of the vectors.
   */
  private _cross(p1: Vector2, p2: Vector2, p3: Vector2): number {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  }
}
