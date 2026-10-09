import type { Matrix4 } from '../matrices/matrix4.js';
import { Vec3, Vector3 } from '../vector3.js';
import type { BoundingBox } from './bounding-box.js';
import type { BoundingSphere } from './bounding-sphere.js';
import type { Plane } from './plane.js';

/**
 * A half-line: the points `origin + direction * t` for `t >= 0`. Its
 * direction is unit length, so `t` is a distance in the ray's space.
 */
export interface Ray {
  /** The point the ray starts at. */
  origin: Vector3;
  /** The direction the ray points in, unit length. */
  direction: Vector3;
}

const axes = ['x', 'y', 'z'] as const;

/**
 * Static operations on {@link Ray}. The intersection tests return the
 * distance along the ray to the first hit at or after its origin, or `null`
 * when there's none: when the ray misses, is parallel to a plane or
 * triangle, or the shape is entirely behind its origin.
 */
export class Rays {
  /**
   * Sets `out` to the point at a distance along a ray.
   * @param out - The point to write.
   * @param ray - The ray.
   * @param distance - The distance along the ray.
   * @returns `out`, for chaining.
   */
  public static at(out: Vector3, ray: Ray, distance: number): Vector3 {
    Vec3.set(out, ray.origin);

    return Vec3.scaleAndAdd(out, ray.direction, distance);
  }

  /**
   * Sets `out` to a ray transformed by a matrix, for example from world
   * space into a mesh's local space with the inverse of its world matrix.
   * The direction is normalized again, so distances along the result are in
   * the new space's units.
   * @param out - The ray to write. It may be `ray`.
   * @param ray - The ray to transform.
   * @param matrix - The affine matrix to transform by.
   * @returns `out`, for chaining.
   * @throws An error if the matrix collapses the ray's direction to zero.
   */
  public static transform(out: Ray, ray: Ray, matrix: Matrix4): Ray {
    Vec3.transformPoint(Vec3.set(out.origin, ray.origin), matrix);
    Vec3.transformDirection(Vec3.set(out.direction, ray.direction), matrix);
    Vec3.normalize(out.direction);

    return out;
  }

  /**
   * Finds where a ray crosses a plane, from either side.
   * @param ray - The ray.
   * @param plane - The plane.
   * @returns The distance along the ray, or `null` if the ray is parallel to
   * the plane or the plane is behind its origin.
   */
  public static intersectPlane(ray: Ray, plane: Plane): number | null {
    const denominator = Vec3.dot(plane.normal, ray.direction);

    if (denominator === 0) {
      return null;
    }

    const distance =
      -(Vec3.dot(plane.normal, ray.origin) + plane.constant) / denominator;

    return distance >= 0 ? distance : null;
  }

  /**
   * Finds where a ray first meets a sphere's surface. From inside the
   * sphere, that's where the ray leaves it.
   * @param ray - The ray.
   * @param sphere - The sphere.
   * @returns The distance along the ray, or `null` if the ray misses.
   */
  public static intersectSphere(
    ray: Ray,
    sphere: BoundingSphere,
  ): number | null {
    const { origin, direction } = ray;
    const offsetX = origin.x - sphere.center.x;
    const offsetY = origin.y - sphere.center.y;
    const offsetZ = origin.z - sphere.center.z;
    const halfB =
      offsetX * direction.x + offsetY * direction.y + offsetZ * direction.z;
    const c =
      offsetX * offsetX +
      offsetY * offsetY +
      offsetZ * offsetZ -
      sphere.radius * sphere.radius;
    const discriminant = halfB * halfB - c;

    if (discriminant < 0) {
      return null;
    }

    const root = Math.sqrt(discriminant);
    const exit = -halfB + root;

    if (exit < 0) {
      return null;
    }

    const entry = -halfB - root;

    return entry >= 0 ? entry : exit;
  }

  /**
   * Finds where a ray first meets a box's surface, using the slab method.
   * From inside the box, that's where the ray leaves it.
   * @param ray - The ray.
   * @param box - The box.
   * @returns The distance along the ray, or `null` if the ray misses or the
   * box is empty.
   */
  public static intersectBox(ray: Ray, box: BoundingBox): number | null {
    const { origin, direction } = ray;
    let entry = -Infinity;
    let exit = Infinity;

    for (const axis of axes) {
      const start = origin[axis];
      const step = direction[axis];
      const min = box.min[axis];
      const max = box.max[axis];

      if (step === 0) {
        if (start < min || start > max) {
          return null;
        }

        continue;
      }

      const toMin = (min - start) / step;
      const toMax = (max - start) / step;

      entry = Math.max(entry, Math.min(toMin, toMax));
      exit = Math.min(exit, Math.max(toMin, toMax));
    }

    if (exit < entry || exit < 0) {
      return null;
    }

    return entry >= 0 ? entry : exit;
  }

  /**
   * Finds where a ray crosses a triangle, using the Möller-Trumbore
   * algorithm. A triangle's front face is the side from which `a`, `b` and
   * `c` are in counter-clockwise order.
   * @param ray - The ray.
   * @param a - The triangle's first corner.
   * @param b - The triangle's second corner.
   * @param c - The triangle's third corner.
   * @param cullBackFaces - Whether a ray meeting the triangle's back face
   * misses it, as picking the outside of a closed mesh needs.
   * @returns The distance along the ray, or `null` if the ray misses, is
   * parallel to the triangle, or meets its back face while `cullBackFaces`
   * is `true`.
   */
  public static intersectTriangle(
    ray: Ray,
    a: Vector3,
    b: Vector3,
    c: Vector3,
    cullBackFaces: boolean,
  ): number | null {
    const { origin, direction } = ray;
    const edge1X = b.x - a.x;
    const edge1Y = b.y - a.y;
    const edge1Z = b.z - a.z;
    const edge2X = c.x - a.x;
    const edge2Y = c.y - a.y;
    const edge2Z = c.z - a.z;
    // p = direction × edge2
    const pX = direction.y * edge2Z - direction.z * edge2Y;
    const pY = direction.z * edge2X - direction.x * edge2Z;
    const pZ = direction.x * edge2Y - direction.y * edge2X;
    // Positive when the ray meets the front face.
    const determinant = edge1X * pX + edge1Y * pY + edge1Z * pZ;

    if (determinant === 0 || (cullBackFaces && determinant < 0)) {
      return null;
    }

    const inverseDeterminant = 1 / determinant;
    const sX = origin.x - a.x;
    const sY = origin.y - a.y;
    const sZ = origin.z - a.z;
    const u = (sX * pX + sY * pY + sZ * pZ) * inverseDeterminant;

    if (u < 0 || u > 1) {
      return null;
    }

    // q = s × edge1
    const qX = sY * edge1Z - sZ * edge1Y;
    const qY = sZ * edge1X - sX * edge1Z;
    const qZ = sX * edge1Y - sY * edge1X;
    const v =
      (direction.x * qX + direction.y * qY + direction.z * qZ) *
      inverseDeterminant;

    if (v < 0 || u + v > 1) {
      return null;
    }

    const distance =
      (edge2X * qX + edge2Y * qY + edge2Z * qZ) * inverseDeterminant;

    return distance >= 0 ? distance : null;
  }
}
