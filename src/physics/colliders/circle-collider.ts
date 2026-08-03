import { createVector2, Vector2, vector2Zero } from '../../math/index.js';
import { Aabb } from '../types/aabb.js';
import { Collider } from './collider.js';

function calculateCircleMass(radius: number, density: number = 1): number {
  return density * Math.PI * radius * radius;
}

function calculateCircleMomentOfInertia(radius: number, mass: number): number {
  return (mass * radius * radius) / 2;
}

export class CircleCollider extends Collider {
  public readonly type = 'circle';
  public offset: Vector2;
  public radius: number;

  constructor(radius: number, density: number = 1) {
    const mass = calculateCircleMass(radius, density);
    const momentOfInertia = calculateCircleMomentOfInertia(radius, mass);

    super(momentOfInertia, mass);

    this.offset = vector2Zero();
    this.radius = radius;
  }

  public computeAabb(position: Vector2): Aabb {
    const cx = position.x + this.offset.x;
    const cy = position.y + this.offset.y;

    return {
      min: createVector2(cx - this.radius, cy - this.radius),
      max: createVector2(cx + this.radius, cy + this.radius),
    };
  }
}
