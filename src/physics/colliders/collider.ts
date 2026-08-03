import { Vector2, vector2Zero } from '../../math/index.js';
import { Aabb } from '../types/aabb.js';

export abstract class Collider {
  public abstract readonly type: 'circle' | 'polygon' | 'terrain';
  public offset: Vector2 = vector2Zero();
  public momentOfInertia: number;
  public mass: number;

  constructor(momentOfInertia: number, mass: number) {
    this.momentOfInertia = momentOfInertia;
    this.mass = mass;
  }

  public abstract computeAabb(position: Vector2, rotation: number): Aabb;
}
