import { Vector2 } from '../../math';
import type { Collider } from './collider';

/**
 * The `BoxCollider` class represents a rectangular collider defined by a point and dimensions.
 * It provides methods to check containment, combine with other colliders, and calculate bounding boxes.
 */
export class BoxCollider implements Collider {
  /** The bottom-left corner point of the box collider */
  public point: Vector2;

  /** The dimensions of the box collider */
  public dimensions: Vector2;

  /**
   * Creates a new instance of the `BoxCollider` class.
   * @param point - The bottom-left corner point of the box collider.
   * @param dimensions - The dimensions of the box collider.
   */
  constructor(point: Vector2, dimensions: Vector2) {
    this.point = point;
    this.dimensions = dimensions;
  }

  /**
   * Gets the minimum x-coordinate of the box collider.
   * @returns The minimum x-coordinate.
   */
  get minX(): number {
    return this.point.x;
  }

  /**
   * Gets the maximum x-coordinate of the box collider.
   * @returns The maximum x-coordinate.
   */
  get maxX(): number {
    return this.point.x + this.dimensions.x;
  }

  /**
   * Gets the minimum y-coordinate of the box collider.
   * @returns The minimum y-coordinate.
   */
  get minY(): number {
    return this.point.y;
  }

  /**
   * Gets the maximum y-coordinate of the box collider.
   * @returns The maximum y-coordinate.
   */
  get maxY(): number {
    return this.point.y + this.dimensions.y;
  }

  /**
   * Gets the middle point of the top edge of the box collider.
   * @returns A `Vector2` representing the middle point of the top edge.
   */
  get middleTop(): Vector2 {
    return new Vector2(this.point.x + this.dimensions.x / 2, this.minY);
  }

  /**
   * Gets the middle point of the bottom edge of the box collider.
   * @returns A `Vector2` representing the middle point of the bottom edge.
   */
  get middleBottom(): Vector2 {
    return new Vector2(this.point.x + this.dimensions.x / 2, this.maxY);
  }

  /**
   * Gets the middle point of the left edge of the box collider.
   * @returns A `Vector2` representing the middle point of the left edge.
   */
  get middleLeft(): Vector2 {
    return new Vector2(this.minX, this.point.y + this.dimensions.y / 2);
  }

  /**
   * Gets the middle point of the right edge of the box collider.
   * @returns A `Vector2` representing the middle point of the right edge.
   */
  get middleRight(): Vector2 {
    return new Vector2(this.maxX, this.point.y + this.dimensions.y / 2);
  }

  /**
   * Checks if a given point is contained within the box collider.
   * @param point - The point to check.
   * @returns `true` if the point is within the box collider, `false` otherwise.
   */
  public contains(point: Vector2): boolean {
    const inXBounds = point.x >= this.minX && point.x <= this.maxX;
    const inYBounds = point.y >= this.minY && point.y <= this.maxY;

    return inXBounds && inYBounds;
  }

  /**
   * Combines this box collider with another box collider to create a new bounding box.
   * @param other - The other box collider to combine with.
   * @returns A new `BoxCollider` representing the combined bounding box.
   */
  public combine(other: BoxCollider): BoxCollider {
    const minX = Math.min(this.minX, other.minX);
    const minY = Math.min(this.minY, other.minY);
    const maxX = Math.max(this.maxX, other.maxX);
    const maxY = Math.max(this.maxY, other.maxY);

    return new BoxCollider(
      new Vector2(minX, minY),
      new Vector2(maxX - minX, maxY - minY),
    );
  }

  /**
   * Combines this box collider with an array of other box colliders to create a new bounding box.
   * @param others - An array of other box colliders to combine with.
   * @returns A new `BoxCollider` representing the combined bounding box.
   */
  public combineAll(others: BoxCollider[]): BoxCollider {
    let minX = this.minX;
    let minY = this.minY;
    let maxX = this.maxX;
    let maxY = this.maxY;

    for (const other of others) {
      if (other.minX < minX) {
        minX = other.minX;
      }
      if (other.minY < minY) {
        minY = other.minY;
      }
      if (other.maxX > maxX) {
        maxX = other.maxX;
      }
      if (other.maxY > maxY) {
        maxY = other.maxY;
      }
    }

    return new BoxCollider(
      new Vector2(minX, minY),
      new Vector2(maxX - minX, maxY - minY),
    );
  }

  /**
   * Creates a new bounding box that encompasses all the given box colliders.
   * @param boxColliders - An array of box colliders to combine.
   * @returns A new `BoxCollider` representing the combined bounding box.
   * @throws An error if the array of box colliders is empty.
   */
  public static fromOtherBoxes(boxColliders: BoxCollider[]): BoxCollider {
    if (boxColliders.length === 0) {
      throw new Error('No boxes to combine');
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const box of boxColliders) {
      if (box.minX < minX) {
        minX = box.minX;
      }
      if (box.minY < minY) {
        minY = box.minY;
      }
      if (box.maxX > maxX) {
        maxX = box.maxX;
      }
      if (box.maxY > maxY) {
        maxY = box.maxY;
      }
    }

    return new BoxCollider(
      new Vector2(minX, minY),
      new Vector2(maxX - minX, maxY - minY),
    );
  }
}
