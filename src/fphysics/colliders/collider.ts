import { Vector2 } from '../../math';
import { Aabb } from '../types/aabb';

export abstract class Collider {
  public offset: Vector2 = Vector2.zero;
  public momentOfInertia: number;
  public mass: number;

  constructor(momentOfInertia: number, mass: number) {
    this.momentOfInertia = momentOfInertia;
    this.mass = mass;
  }

  public abstract computeAabb(position: Vector2): Aabb;
}
