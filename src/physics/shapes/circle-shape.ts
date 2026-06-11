import type { ShapeBase } from './shape.js';

/**
 * A circular collision shape, defined by a radius around its local origin.
 */
export class CircleShape implements ShapeBase {
  public readonly type = 'circle';

  public readonly radius: number;

  /**
   * Creates a new CircleShape instance.
   * @param radius - The radius of the circle.
   * @throws An error if the radius is not positive.
   */
  constructor(radius: number) {
    if (radius <= 0) {
      throw new Error(
        `CircleShape radius must be positive, received "${radius}".`,
      );
    }

    this.radius = radius;
  }

  /**
   * Calculates the area of the circle.
   * @returns The area of the circle.
   */
  public getArea(): number {
    return Math.PI * this.radius * this.radius;
  }

  /**
   * Calculates the moment of inertia of a solid disc for a given mass.
   * @param mass - The mass of the body the shape belongs to.
   * @returns The moment of inertia of the circle.
   */
  public getMomentOfInertia(mass: number): number {
    return (mass * this.radius * this.radius) / 2;
  }

  /**
   * Returns the radius of the circle.
   * @returns The bounding radius of the circle.
   */
  public getBoundingRadius(): number {
    return this.radius;
  }
}
