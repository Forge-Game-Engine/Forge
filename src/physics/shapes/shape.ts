import type { CircleShape } from './circle-shape.js';
import type { PolygonShape } from './polygon-shape.js';

/**
 * The kind of geometry a {@link Shape} represents.
 */
export type ShapeType = 'circle' | 'polygon';

/**
 * Common contract implemented by all collision shapes.
 */
export interface ShapeBase {
  /**
   * The kind of shape this is, used to dispatch collision detection.
   */
  type: ShapeType;

  /**
   * Calculates the area of the shape.
   * @returns The area of the shape.
   */
  getArea(): number;

  /**
   * Calculates the moment of inertia of the shape for a given mass.
   * @param mass - The mass of the body the shape belongs to.
   * @returns The moment of inertia of the shape.
   */
  getMomentOfInertia(mass: number): number;

  /**
   * Calculates the radius of the smallest circle, centered on the shape's
   * local origin, that fully contains the shape. Used for broad-phase AABB
   * calculations.
   * @returns The bounding radius of the shape.
   */
  getBoundingRadius(): number;
}

/**
 * A collision shape, either a {@link CircleShape} or a {@link PolygonShape}.
 */
export type Shape = CircleShape | PolygonShape;
