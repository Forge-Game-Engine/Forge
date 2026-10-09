import type { Matrix4 } from '../matrices/matrix4.js';
import { Vec3, Vector3 } from '../vector3.js';

/**
 * An axis-aligned box defined by its smallest (`min`) and largest (`max`)
 * corners. A box whose `min` is greater than its `max` on any axis is
 * empty: it contains no points (see {@link BoundingBoxes.empty}).
 */
export interface BoundingBox {
  /** The corner with the smallest coordinates. */
  min: Vector3;
  /** The corner with the largest coordinates. */
  max: Vector3;
}

/**
 * Static operations on {@link BoundingBox}. Every operation that writes a
 * box or vector writes into its first argument (`target` or `out`) and
 * returns it.
 */
export class BoundingBoxes {
  /**
   * Creates an empty box: `min` is `+∞` and `max` is `-∞` on every axis, so
   * the first point or box added with {@link BoundingBoxes.expandByPoint} or
   * {@link BoundingBoxes.union} sets it.
   * @returns A new, empty `BoundingBox`.
   */
  public static empty(): BoundingBox {
    return {
      min: { x: Infinity, y: Infinity, z: Infinity },
      max: { x: -Infinity, y: -Infinity, z: -Infinity },
    };
  }

  /**
   * Sets `out` to empty, as {@link BoundingBoxes.empty} creates it.
   * @param out - The box to write.
   * @returns `out`, for chaining.
   */
  public static makeEmpty(out: BoundingBox): BoundingBox {
    Vec3.setComponents(out.min, Infinity, Infinity, Infinity);
    Vec3.setComponents(out.max, -Infinity, -Infinity, -Infinity);

    return out;
  }

  /**
   * Checks if a box is empty.
   * @param box - The box.
   * @returns `true` if `min` is greater than `max` on any axis.
   */
  public static isEmpty(box: BoundingBox): boolean {
    return (
      box.min.x > box.max.x || box.min.y > box.max.y || box.min.z > box.max.z
    );
  }

  /**
   * Sets `out` to the smallest box containing a list of positions, such as
   * a mesh's vertex positions.
   * @param out - The box to write.
   * @param positions - The positions' components.
   * @param stride - The number of elements from one position to the next
   * (`3` for tightly packed positions).
   * @param offset - The index of the first position's `x`.
   * @returns `out`, for chaining. Empty if there are no positions.
   */
  public static fromPositions(
    out: BoundingBox,
    positions: Float32Array,
    stride: number,
    offset: number,
  ): BoundingBox {
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    for (let i = offset; i + 2 < positions.length; i += stride) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    Vec3.setComponents(out.min, minX, minY, minZ);
    Vec3.setComponents(out.max, maxX, maxY, maxZ);

    return out;
  }

  /**
   * Grows `target` to contain a point.
   * @param target - The box to mutate.
   * @param point - The point.
   * @returns `target`, for chaining.
   */
  public static expandByPoint(
    target: BoundingBox,
    point: Vector3,
  ): BoundingBox {
    Vec3.min(target.min, point);
    Vec3.max(target.max, point);

    return target;
  }

  /**
   * Grows `target` to contain another box.
   * @param target - The box to mutate.
   * @param value - The box to contain. An empty box leaves `target`
   * unchanged.
   * @returns `target`, for chaining.
   */
  public static union(target: BoundingBox, value: BoundingBox): BoundingBox {
    Vec3.min(target.min, value.min);
    Vec3.max(target.max, value.max);

    return target;
  }

  /**
   * Sets `out` to a box's center.
   * @param out - The point to write.
   * @param box - The box, not empty.
   * @returns `out`, for chaining.
   */
  public static center(out: Vector3, box: BoundingBox): Vector3 {
    return Vec3.setComponents(
      out,
      (box.min.x + box.max.x) / 2,
      (box.min.y + box.max.y) / 2,
      (box.min.z + box.max.z) / 2,
    );
  }

  /**
   * Sets `out` to half a box's size along each axis.
   * @param out - The vector to write.
   * @param box - The box, not empty.
   * @returns `out`, for chaining.
   */
  public static halfExtents(out: Vector3, box: BoundingBox): Vector3 {
    return Vec3.setComponents(
      out,
      (box.max.x - box.min.x) / 2,
      (box.max.y - box.min.y) / 2,
      (box.max.z - box.min.z) / 2,
    );
  }

  /**
   * Sets `out` to the smallest axis-aligned box containing a box
   * transformed by a matrix, for example a mesh's local bounds moved into
   * world space by its world matrix. Computed in constant time from the
   * transformed center and the absolute matrix times the half extents.
   * @param out - The box to write. It may be `box`.
   * @param box - The box to transform.
   * @param matrix - The affine matrix to transform by.
   * @returns `out`, for chaining. Empty if `box` is empty.
   */
  public static transform(
    out: BoundingBox,
    box: BoundingBox,
    matrix: Matrix4,
  ): BoundingBox {
    if (BoundingBoxes.isEmpty(box)) {
      return BoundingBoxes.makeEmpty(out);
    }

    const centerX = (box.min.x + box.max.x) / 2;
    const centerY = (box.min.y + box.max.y) / 2;
    const centerZ = (box.min.z + box.max.z) / 2;
    const extentX = (box.max.x - box.min.x) / 2;
    const extentY = (box.max.y - box.min.y) / 2;
    const extentZ = (box.max.z - box.min.z) / 2;
    const newCenterX =
      matrix[0] * centerX +
      matrix[4] * centerY +
      matrix[8] * centerZ +
      matrix[12];
    const newCenterY =
      matrix[1] * centerX +
      matrix[5] * centerY +
      matrix[9] * centerZ +
      matrix[13];
    const newCenterZ =
      matrix[2] * centerX +
      matrix[6] * centerY +
      matrix[10] * centerZ +
      matrix[14];
    const newExtentX =
      Math.abs(matrix[0]) * extentX +
      Math.abs(matrix[4]) * extentY +
      Math.abs(matrix[8]) * extentZ;
    const newExtentY =
      Math.abs(matrix[1]) * extentX +
      Math.abs(matrix[5]) * extentY +
      Math.abs(matrix[9]) * extentZ;
    const newExtentZ =
      Math.abs(matrix[2]) * extentX +
      Math.abs(matrix[6]) * extentY +
      Math.abs(matrix[10]) * extentZ;

    Vec3.setComponents(
      out.min,
      newCenterX - newExtentX,
      newCenterY - newExtentY,
      newCenterZ - newExtentZ,
    );
    Vec3.setComponents(
      out.max,
      newCenterX + newExtentX,
      newCenterY + newExtentY,
      newCenterZ + newExtentZ,
    );

    return out;
  }

  /**
   * Checks if two boxes overlap, including touching faces.
   * @param a - The first box.
   * @param b - The second box.
   * @returns `true` if the boxes share at least one point.
   */
  public static intersects(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.min.x <= b.max.x &&
      a.max.x >= b.min.x &&
      a.min.y <= b.max.y &&
      a.max.y >= b.min.y &&
      a.min.z <= b.max.z &&
      a.max.z >= b.min.z
    );
  }

  /**
   * Checks if a point is inside a box, including its faces.
   * @param box - The box.
   * @param point - The point.
   * @returns `true` if the point is inside the box.
   */
  public static containsPoint(box: BoundingBox, point: Vector3): boolean {
    return (
      point.x >= box.min.x &&
      point.x <= box.max.x &&
      point.y >= box.min.y &&
      point.y <= box.max.y &&
      point.z >= box.min.z &&
      point.z <= box.max.z
    );
  }
}
