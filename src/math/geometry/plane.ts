import { Vec3, Vector3 } from '../vector3.js';

/**
 * An infinite plane: the points `p` with `dot(normal, p) + constant = 0`.
 * The side the normal points to is in front of the plane, where
 * {@link Planes.signedDistance} is positive.
 */
export interface Plane {
  /** The plane's normal, unit length. */
  normal: Vector3;
  /** The plane's signed distance from the origin, along `-normal`. */
  constant: number;
}

/**
 * Static operations on {@link Plane}. Every operation that writes a plane
 * or vector writes into its first argument (`target` or `out`) and returns
 * it.
 */
export class Planes {
  /**
   * Sets `out` to the plane through a point with the given normal.
   * @param out - The plane to write.
   * @param point - A point on the plane.
   * @param normal - The plane's normal, unit length.
   * @returns `out`, for chaining.
   */
  public static fromPointAndNormal(
    out: Plane,
    point: Vector3,
    normal: Vector3,
  ): Plane {
    Vec3.set(out.normal, normal);
    out.constant = -Vec3.dot(normal, point);

    return out;
  }

  /**
   * Sets `out` to the plane through three points. Its normal faces the side
   * from which `a`, `b` and `c` are in counter-clockwise order.
   * @param out - The plane to write.
   * @param a - The first point.
   * @param b - The second point.
   * @param c - The third point.
   * @returns `out`, for chaining.
   * @throws An error if the points are on one line, which doesn't define a
   * plane.
   */
  public static fromPoints(
    out: Plane,
    a: Vector3,
    b: Vector3,
    c: Vector3,
  ): Plane {
    const abX = b.x - a.x;
    const abY = b.y - a.y;
    const abZ = b.z - a.z;
    const acX = c.x - a.x;
    const acY = c.y - a.y;
    const acZ = c.z - a.z;
    const normal = Vec3.setComponents(
      out.normal,
      abY * acZ - abZ * acY,
      abZ * acX - abX * acZ,
      abX * acY - abY * acX,
    );

    if (Vec3.magnitudeSquared(normal) === 0) {
      throw new Error('Unable to build a plane from three points on one line.');
    }

    Vec3.normalize(normal);
    out.constant = -Vec3.dot(normal, a);

    return out;
  }

  /**
   * Scales a plane's normal to unit length, and its constant with it, so
   * the plane stays the same. Use it on a plane built from values whose
   * normal isn't unit length.
   * @param target - The plane to mutate.
   * @returns `target`, for chaining.
   * @throws An error if the normal is a zero vector.
   */
  public static normalize(target: Plane): Plane {
    const length = Vec3.magnitude(target.normal);

    if (length === 0) {
      throw new Error('Unable to normalize a Plane with a zero normal.');
    }

    Vec3.divide(target.normal, length);
    target.constant /= length;

    return target;
  }

  /**
   * Calculates the signed distance from a plane to a point.
   * @param plane - The plane.
   * @param point - The point.
   * @returns The distance: positive in front of the plane (the side its
   * normal points to), negative behind it and `0` on it.
   */
  public static signedDistance(plane: Plane, point: Vector3): number {
    return Vec3.dot(plane.normal, point) + plane.constant;
  }

  /**
   * Sets `out` to the point on a plane closest to `point`.
   * @param out - The point to write. It may be `point`.
   * @param plane - The plane.
   * @param point - The point to project.
   * @returns `out`, for chaining.
   */
  public static projectPoint(
    out: Vector3,
    plane: Plane,
    point: Vector3,
  ): Vector3 {
    const distance = Planes.signedDistance(plane, point);

    Vec3.set(out, point);

    return Vec3.scaleAndAdd(out, plane.normal, -distance);
  }
}
