import type { DepthRange, Matrix4 } from '../matrices/matrix4.js';
import { Vec3, Vector3 } from '../vector3.js';
import type { BoundingBox } from './bounding-box.js';
import type { BoundingSphere } from './bounding-sphere.js';
import { Plane, Planes } from './plane.js';

/**
 * The volume a camera sees, bounded by six planes whose normals point
 * inwards: a point is inside when it's in front of every plane.
 */
export interface Frustum {
  /** The left, right, bottom, top, near and far planes, in that order. */
  planes: [Plane, Plane, Plane, Plane, Plane, Plane];
}

/**
 * Static operations on {@link Frustum}. Every operation that writes a
 * frustum or points writes into its first argument (`out`) and returns it.
 */
export class Frustums {
  /**
   * Creates a frustum whose planes contain every point, to fill with
   * {@link Frustums.fromViewProjection}.
   * @returns A new `Frustum`.
   */
  public static create(): Frustum {
    return {
      planes: [
        createPassingPlane(),
        createPassingPlane(),
        createPassingPlane(),
        createPassingPlane(),
        createPassingPlane(),
        createPassingPlane(),
      ],
    };
  }

  /**
   * Sets `out` to the frustum of a view-projection matrix (a projection
   * times a view matrix), with planes in world space, or of a projection
   * matrix alone, with planes in view space. The planes are extracted from
   * the matrix's rows and normalized. A projection with no far plane
   * ({@link Mat4.perspectiveInfinite}) gives a far plane with a zero normal
   * and a constant of `+∞`, which every point is in front of.
   * @param out - The frustum to write.
   * @param matrix - The view-projection matrix.
   * @param depthRange - The clip-space depth range the matrix was built
   * for, which decides where the near plane is.
   * @returns `out`, for chaining.
   */
  public static fromViewProjection(
    out: Frustum,
    matrix: Matrix4,
    depthRange: DepthRange,
  ): Frustum {
    const [left, right, bottom, top, near, far] = out.planes;
    // Row r of the matrix is (m[r], m[4 + r], m[8 + r], m[12 + r]).
    const m0 = matrix[0];
    const m1 = matrix[1];
    const m2 = matrix[2];
    const m3 = matrix[3];
    const m4 = matrix[4];
    const m5 = matrix[5];
    const m6 = matrix[6];
    const m7 = matrix[7];
    const m8 = matrix[8];
    const m9 = matrix[9];
    const m10 = matrix[10];
    const m11 = matrix[11];
    const m12 = matrix[12];
    const m13 = matrix[13];
    const m14 = matrix[14];
    const m15 = matrix[15];

    setPlane(left, m3 + m0, m7 + m4, m11 + m8, m15 + m12);
    setPlane(right, m3 - m0, m7 - m4, m11 - m8, m15 - m12);
    setPlane(bottom, m3 + m1, m7 + m5, m11 + m9, m15 + m13);
    setPlane(top, m3 - m1, m7 - m5, m11 - m9, m15 - m13);
    setPlane(far, m3 - m2, m7 - m6, m11 - m10, m15 - m14);

    // The near plane is clip z >= -w for [-1, 1] depth, and z >= 0 for
    // [0, 1] depth.
    const nearW = depthRange === 'zeroToOne' ? 0 : 1;

    setPlane(
      near,
      nearW * m3 + m2,
      nearW * m7 + m6,
      nearW * m11 + m10,
      nearW * m15 + m14,
    );

    return out;
  }

  /**
   * Checks if a sphere is at least partly inside a frustum, for culling.
   * The test is conservative: a sphere just outside a corner of the frustum
   * can count as inside.
   * @param frustum - The frustum.
   * @param sphere - The sphere.
   * @returns `false` if the sphere is entirely behind one of the planes.
   */
  public static intersectsSphere(
    frustum: Frustum,
    sphere: BoundingSphere,
  ): boolean {
    const negativeRadius = -sphere.radius;

    for (const plane of frustum.planes) {
      if (Planes.signedDistance(plane, sphere.center) < negativeRadius) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if a box is at least partly inside a frustum, for culling. For
   * each plane, it tests the box corner furthest along the plane's normal.
   * The test is conservative: a box just outside a corner of the frustum
   * can count as inside.
   * @param frustum - The frustum.
   * @param box - The box.
   * @returns `false` if the box is entirely behind one of the planes.
   */
  public static intersectsBox(frustum: Frustum, box: BoundingBox): boolean {
    const { min, max } = box;

    for (const { normal, constant } of frustum.planes) {
      const x = normal.x >= 0 ? max.x : min.x;
      const y = normal.y >= 0 ? max.y : min.y;
      const z = normal.z >= 0 ? max.z : min.z;

      if (normal.x * x + normal.y * y + normal.z * z + constant < 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if a point is inside a frustum, including its planes.
   * @param frustum - The frustum.
   * @param point - The point.
   * @returns `true` if the point is in front of or on every plane.
   */
  public static containsPoint(frustum: Frustum, point: Vector3): boolean {
    for (const plane of frustum.planes) {
      if (Planes.signedDistance(plane, point) < 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sets `out` to the eight corners of the frustum of a view-projection
   * matrix, by transforming the clip-space corners by its inverse: the near
   * plane's corners first, then the far plane's, each in the order
   * left-bottom, right-bottom, left-top, right-top.
   * @param out - The eight points to write.
   * @param inverseMatrix - The inverse of the view-projection matrix. Its
   * projection must have a far plane: the far corners of a projection with
   * none are at infinity.
   * @param depthRange - The clip-space depth range the matrix was built for.
   * @returns `out`, for chaining.
   * @throws An error if `out` doesn't hold exactly eight points.
   */
  public static corners(
    out: Vector3[],
    inverseMatrix: Matrix4,
    depthRange: DepthRange,
  ): Vector3[] {
    if (out.length !== 8) {
      throw new Error(
        `Frustums.corners writes 8 points, but was given ${out.length}.`,
      );
    }

    const nearZ = depthRange === 'zeroToOne' ? 0 : -1;

    for (let i = 0; i < 8; i++) {
      const x = i % 2 === 0 ? -1 : 1;
      const y = i % 4 < 2 ? -1 : 1;
      const z = i < 4 ? nearZ : 1;

      Vec3.transformPointProjective(
        Vec3.setComponents(out[i], x, y, z),
        inverseMatrix,
      );
    }

    return out;
  }
}

const createPassingPlane = (): Plane => ({
  normal: { x: 0, y: 0, z: 0 },
  constant: Infinity,
});

/**
 * Sets a frustum plane from a matrix-row combination `(a, b, c, d)`,
 * normalized. A zero normal comes from a far plane at infinity; it's stored
 * as a plane every point is in front of rather than normalized into `NaN`.
 */
const setPlane = (
  plane: Plane,
  a: number,
  b: number,
  c: number,
  d: number,
): void => {
  const length = Math.sqrt(a * a + b * b + c * c);

  if (length === 0) {
    Vec3.setComponents(plane.normal, 0, 0, 0);
    plane.constant = Infinity;

    return;
  }

  Vec3.setComponents(plane.normal, a / length, b / length, c / length);
  plane.constant = d / length;
};
