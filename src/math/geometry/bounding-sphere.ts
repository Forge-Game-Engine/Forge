import { Mat4, Matrix4 } from '../matrices/matrix4.js';
import { Vec3, Vector3 } from '../vector3.js';
import type { BoundingBox } from './bounding-box.js';

/**
 * A sphere defined by its center and radius.
 */
export interface BoundingSphere {
  /** The sphere's center. */
  center: Vector3;
  /** The sphere's radius. */
  radius: number;
}

/**
 * Static operations on {@link BoundingSphere}. Every operation that writes
 * a sphere writes into its first argument (`target` or `out`) and returns
 * it.
 */
export class BoundingSpheres {
  /**
   * Sets `out` to the smallest sphere containing a box: centered on the
   * box, with the half diagonal as its radius.
   * @param out - The sphere to write.
   * @param box - The box, not empty.
   * @returns `out`, for chaining.
   */
  public static fromBox(out: BoundingSphere, box: BoundingBox): BoundingSphere {
    const halfX = (box.max.x - box.min.x) / 2;
    const halfY = (box.max.y - box.min.y) / 2;
    const halfZ = (box.max.z - box.min.z) / 2;

    Vec3.setComponents(
      out.center,
      box.min.x + halfX,
      box.min.y + halfY,
      box.min.z + halfZ,
    );
    out.radius = Math.sqrt(halfX * halfX + halfY * halfY + halfZ * halfZ);

    return out;
  }

  /**
   * Sets `out` to a sphere transformed by a matrix. The radius is scaled by
   * the matrix's largest scale ({@link Mat4.getMaxScale}), so the result
   * contains the transformed sphere even under non-uniform scale.
   * @param out - The sphere to write. It may be `sphere`.
   * @param sphere - The sphere to transform.
   * @param matrix - The affine matrix to transform by.
   * @returns `out`, for chaining.
   */
  public static transform(
    out: BoundingSphere,
    sphere: BoundingSphere,
    matrix: Matrix4,
  ): BoundingSphere {
    Vec3.transformPoint(Vec3.set(out.center, sphere.center), matrix);
    out.radius = sphere.radius * Mat4.getMaxScale(matrix);

    return out;
  }

  /**
   * Checks if two spheres overlap, including touching.
   * @param a - The first sphere.
   * @param b - The second sphere.
   * @returns `true` if the spheres share at least one point.
   */
  public static intersects(a: BoundingSphere, b: BoundingSphere): boolean {
    const radii = a.radius + b.radius;

    return Vec3.distanceSquared(a.center, b.center) <= radii * radii;
  }

  /**
   * Grows `target` to the smallest sphere containing both it and `value`.
   * @param target - The sphere to mutate.
   * @param value - The sphere to contain.
   * @returns `target`, for chaining.
   */
  public static merge(
    target: BoundingSphere,
    value: BoundingSphere,
  ): BoundingSphere {
    const distance = Vec3.distance(target.center, value.center);

    if (distance + value.radius <= target.radius) {
      return target;
    }

    if (distance + target.radius <= value.radius) {
      Vec3.set(target.center, value.center);
      target.radius = value.radius;

      return target;
    }

    const radius = (distance + target.radius + value.radius) / 2;
    const t = (radius - target.radius) / distance;

    Vec3.lerp(target.center, value.center, t);
    target.radius = radius;

    return target;
  }
}
