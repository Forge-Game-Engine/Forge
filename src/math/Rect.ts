import { Vector2 } from './vector2';

/** A class representing a rectangle defined by an origin point and size. */
export class Rect {
  /** The origin point (top-left corner) of the rectangle. */
  public origin: Vector2;
  /** The size (width and height) of the rectangle. */
  public size: Vector2;

  /** Constructs a new `Rect` instance.
   * @param origin - The origin point of the rectangle.
   * @param size - The size of the rectangle.
   */
  constructor(origin: Vector2, size: Vector2) {
    this.origin = origin;
    this.size = size;
  }

  /** Checks if a given point is inside the rectangle.
   * @param point - The point to check.
   * @returns True if the point is inside the rectangle, false otherwise.
   */
  public containsPoint(point: Vector2): boolean {
    return (
      point.x >= this.origin.x &&
      point.x <= this.origin.x + this.size.x &&
      point.y >= this.origin.y &&
      point.y <= this.origin.y + this.size.y
    );
  }
}
