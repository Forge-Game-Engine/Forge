import { Vector2 } from './vector2.js';

/**
 * A plain axis-aligned rectangle defined by its lower-left (`min`) and
 * upper-right (`max`) corners.
 */
export interface Rect {
  min: Vector2;
  max: Vector2;
}

/**
 * Static operations on {@link Rect}, mirroring the `Vector2`/`Vec2`
 * convention.
 */
export class Rects {
  /**
   * A zero-size rect at the origin. A fresh instance is created on every
   * access, so it's always safe to mutate.
   */
  static get zero(): Rect {
    return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
  }

  /**
   * Calculates a rect's size.
   * @param rect - The rect.
   * @returns A new `Vector2` holding `max - min`.
   */
  public static size(rect: Rect): Vector2 {
    return {
      x: rect.max.x - rect.min.x,
      y: rect.max.y - rect.min.y,
    };
  }

  /**
   * Checks if a point is inside a rect, inclusive of its edges.
   * @param rect - The rect to check.
   * @param point - The point to check.
   * @returns True if the point is inside the rect, false otherwise.
   */
  public static contains(rect: Rect, point: Vector2): boolean {
    return (
      point.x >= rect.min.x &&
      point.x <= rect.max.x &&
      point.y >= rect.min.y &&
      point.y <= rect.max.y
    );
  }

  /**
   * Checks if two rects overlap, inclusive of touching edges/corners.
   * @param a - The first rect.
   * @param b - The second rect.
   * @returns True if the rects overlap, false otherwise.
   */
  public static intersects(a: Rect, b: Rect): boolean {
    return (
      a.min.x <= b.max.x &&
      a.max.x >= b.min.x &&
      a.min.y <= b.max.y &&
      a.max.y >= b.min.y
    );
  }

  /**
   * Creates a deep copy of a rect.
   * @param rect - The rect to copy.
   * @returns A new `Rect` with the same corner values.
   */
  public static clone(rect: Rect): Rect {
    return {
      min: { x: rect.min.x, y: rect.min.y },
      max: { x: rect.max.x, y: rect.max.y },
    };
  }
}
