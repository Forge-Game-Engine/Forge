import { Vec2, Vector2 } from '../../math/index.js';
import { Aabb } from '../types/aabb.js';
import { Collider } from './collider.js';

function calculateCircleMass(radius: number, density: number = 1): number {
  return density * Math.PI * radius * radius;
}

function calculateCircleMomentOfInertia(radius: number, mass: number): number {
  return (mass * radius * radius) / 2;
}

/**
 * A circle collider: a `radius` around a `center` in the entity's local
 * space. The center turns with the entity, like a polygon's vertices.
 */
export class CircleCollider extends Collider {
  public readonly type = 'circle';
  public radius: number;

  /**
   * The circle's center, in the entity's local space. Never mutate it:
   * it's also the collider's {@link localCenterOfMass}.
   */
  public readonly center: Vector2;

  /**
   * Creates a new CircleCollider instance.
   * @param radius - The circle's radius.
   * @param density - The density used to derive mass from the circle's
   * area.
   * @param center - The circle's center, in the entity's local space.
   * Defaults to the entity's origin.
   */
  constructor(
    radius: number,
    density: number = 1,
    center: Vector2 = Vec2.zero,
  ) {
    const mass = calculateCircleMass(radius, density);
    const momentOfInertia = calculateCircleMomentOfInertia(radius, mass);
    // Clone: the caller may reuse or mutate the vector it passed in.
    const localCenter = Vec2.clone(center);

    super(mass, momentOfInertia, localCenter);

    this.radius = radius;
    this.center = localCenter;
  }

  /**
   * Transforms the circle's local `center` into world space.
   * @param position - The world-space position of the entity.
   * @param rotation - The world-space rotation of the entity, in radians.
   * @returns The circle's world-space center, freshly allocated.
   */
  public getWorldCenter(position: Vector2, rotation: number): Vector2 {
    // Clone before rotating: `this.center` is the collider's own data.
    return Vec2.add(Vec2.rotate(Vec2.clone(this.center), rotation), position);
  }

  public computeAabb(position: Vector2, rotation: number): Aabb {
    const center = this.getWorldCenter(position, rotation);

    return {
      min: { x: center.x - this.radius, y: center.y - this.radius },
      max: { x: center.x + this.radius, y: center.y + this.radius },
    };
  }
}
