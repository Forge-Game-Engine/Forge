import { Vector2 } from '../../math/index.js';
import { Aabb } from '../types/aabb.js';

/**
 * The kinds of collision shape, one per {@link Collider} subclass.
 */
export type ColliderType = 'circle' | 'polygon' | 'terrain' | 'chain';

/**
 * A collision shape, defined in the local space of the entity it's attached
 * to: the entity's world position and rotation place it in the world.
 *
 * A collider also carries the mass data a dynamic `RigidBodyEcsComponent`
 * on the same entity simulates with, computed from the shape's area and
 * density.
 */
export abstract class Collider {
  public abstract readonly type: ColliderType;

  /**
   * Whether a `'dynamic'` rigid body can use this collider. Heightmap and
   * outline shapes (`TerrainCollider`, `ChainCollider`) describe level
   * geometry, have no meaningful mass distribution and are only collided
   * against from outside, so `getRigidBodyMassData` throws for a dynamic
   * body that has one.
   */
  public abstract readonly supportsDynamicBodies: boolean;

  /**
   * The shape's mass: its area times its density. A collider whose
   * {@link supportsDynamicBodies} is `false` has a mass and moment of
   * inertia of `0` and its center of mass at the origin, since no body
   * simulates it.
   */
  public readonly mass: number;

  /**
   * The shape's moment of inertia about its center of mass
   * ({@link localCenterOfMass}). `0` for a collider that can't be dynamic
   * (see {@link mass}).
   */
  public readonly momentOfInertia: number;

  /**
   * The shape's center of mass (its centroid, for a uniform density), in
   * the entity's local space. A dynamic body turns about this point. The
   * origin for a collider that can't be dynamic (see {@link mass}).
   *
   * Never mutate it: it's the collider's own data, and several bodies can
   * share one collider.
   */
  public readonly localCenterOfMass: Vector2;

  constructor(
    mass: number,
    momentOfInertia: number,
    localCenterOfMass: Vector2,
  ) {
    this.mass = mass;
    this.momentOfInertia = momentOfInertia;
    this.localCenterOfMass = localCenterOfMass;
  }

  public abstract computeAabb(position: Vector2, rotation: number): Aabb;
}
