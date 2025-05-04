import { Vector2 } from '../../math';
import type { Collider } from './collider';

/**
 * The `CircleCollider` class represents a circular collider defined by a center point and radius.
 * It provides methods to check containment, combine with other colliders, and calculate bounding boxes.
 */
export class CircleCollider implements Collider<CircleCollider> {
  public center: Vector2;
  public radius: number;

  /**
   * Creates a new instance of the `CircleCollider` class.
   * @param center - The center point of the circle.
   * @param radius - The radius of the circle.
   */
  constructor(center: Vector2, radius: number) {
    this.center = center;
    this.radius = radius;
  }

  /**
   * Gets the minimum x-coordinate of the circle.
   * @returns The minimum x-coordinate.
   */
  get minX(): number {
    return this.center.x - this.radius;
  }

  /**
   * Gets the maximum x-coordinate of the circle.
   * @returns The maximum x-coordinate.
   */
  get maxX(): number {
    return this.center.x + this.radius;
  }

  /**
   * Gets the minimum y-coordinate of the circle.
   * @returns The minimum y-coordinate.
   */
  get minY(): number {
    return this.center.y - this.radius;
  }

  /**
   * Gets the maximum y-coordinate of the circle.
   * @returns The maximum y-coordinate.
   */
  get maxY(): number {
    return this.center.y + this.radius;
  }

  /**
   * Checks if a given point is contained within the circle collider.
   * @param point - The point to check.
   * @returns `true` if the point is within the circle collider, `false` otherwise.
   */
  public contains(point: Vector2): boolean {
    const dx = point.x - this.center.x;
    const dy = point.y - this.center.y;

    return dx * dx + dy * dy <= this.radius * this.radius;
  }
}
