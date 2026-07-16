import { clamp, Rect, Vector2 } from '../math/index.js';
import type { Shape } from './shapes/index.js';

/**
 * Options for creating a {@link RigidBody}.
 */
export interface RigidBodyOptions {
  /**
   * The collision shape of the body.
   */
  shape: Shape;

  /**
   * The world-space position of the body's center of mass.
   */
  position?: Vector2;

  /**
   * The world-space rotation of the body, in radians.
   */
  angle?: number;

  /**
   * Whether the body is static (immovable, infinite mass).
   */
  isStatic?: boolean;

  /**
   * Whether the body is a sensor. Sensor bodies still participate in
   * collision detection (and so still produce `collisionStarts` /
   * `collisionEnds` events), but are skipped during collision resolution -
   * they apply no impulses or positional correction to either body in the
   * pair.
   */
  isSensor?: boolean;

  /**
   * The density of the body, used to calculate mass and inertia from the
   * shape's area. Ignored for static bodies.
   */
  density?: number;

  /**
   * The restitution (bounciness) of the body, clamped to the range [0, 1].
   */
  restitution?: number;

  /**
   * The friction coefficient of the body, clamped to the range [0, 1].
   */
  friction?: number;
}

const defaultRigidBodyOptions = {
  position: Vector2.zero,
  angle: 0,
  isStatic: false,
  isSensor: false,
  density: 1,
  restitution: 0.2,
  friction: 0.3,
};

/**
 * A rigid body participating in a {@link PhysicsWorld} simulation. Stores
 * the body's shape, transform, motion state, and mass properties.
 */
export class RigidBody {
  public position: Vector2;

  public angle: number;

  public velocity: Vector2;

  public angularVelocity: number;

  public readonly id: number;

  public readonly shape: Shape;

  public readonly isStatic: boolean;

  public readonly isSensor: boolean;

  public readonly mass: number;

  public readonly inverseMass: number;

  public readonly inertia: number;

  public readonly inverseInertia: number;

  public readonly restitution: number;

  public readonly friction: number;

  /**
   * Arbitrary data associated with this body by the consumer (e.g. an ECS
   * entity id). Not read or written by the physics simulation itself.
   */
  public userData?: unknown;

  /**
   * The most recently computed {@link aabb} and the position it was
   * computed for. Re-used while `position` is unchanged to avoid
   * reallocating a `Rect` on every access, since broad-phase collision
   * detection reads `aabb` for the same body many times per step.
   */
  private _aabbCache: { position: Vector2; aabb: Rect } | null;

  private _forceAccumulator: Vector2;

  private _torqueAccumulator: number;

  private static _nextId = 0;

  /**
   * Creates a new RigidBody instance.
   * @param options - The options for the body.
   */
  constructor(options: RigidBodyOptions) {
    const {
      shape,
      position,
      angle,
      isStatic,
      isSensor,
      density,
      restitution,
      friction,
    } = {
      ...defaultRigidBodyOptions,
      ...options,
    };

    this.id = RigidBody._generateId();
    this.shape = shape;
    this.position = position.clone();
    this.angle = angle;
    this.velocity = Vector2.zero;
    this.angularVelocity = 0;
    this.isStatic = isStatic;
    this.isSensor = isSensor;
    this.restitution = clamp(restitution, 0, 1);
    this.friction = clamp(friction, 0, 1);
    this._aabbCache = null;
    this._forceAccumulator = Vector2.zero;
    this._torqueAccumulator = 0;

    if (isStatic) {
      this.mass = 0;
      this.inverseMass = 0;
      this.inertia = 0;
      this.inverseInertia = 0;
    } else {
      this.mass = shape.getArea() * density;
      this.inverseMass = this.mass > 0 ? 1 / this.mass : 0;
      this.inertia = shape.getMomentOfInertia(this.mass);
      this.inverseInertia = this.inertia > 0 ? 1 / this.inertia : 0;
    }
  }

  private static _generateId(): number {
    return RigidBody._nextId++;
  }

  /**
   * The conservative axis-aligned bounding box of the body, used for
   * broad-phase collision detection.
   */
  get aabb(): Rect {
    const cache = this._aabbCache;

    if (cache && cache.position.equals(this.position)) {
      return cache.aabb;
    }

    const radius = this.shape.getBoundingRadius();
    const aabb = new Rect(
      new Vector2(this.position.x - radius, this.position.y - radius),
      new Vector2(radius * 2, radius * 2),
    );

    this._aabbCache = { position: this.position.clone(), aabb };

    return aabb;
  }

  /**
   * Applies a linear and angular impulse to the body at a world-space
   * contact point relative to its center of mass.
   * @param impulse - The impulse to apply.
   * @param contactPoint - The point at which to apply the impulse, relative
   * to the body's center of mass.
   */
  public applyImpulse(impulse: Vector2, contactPoint: Vector2): void {
    this.velocity = this.velocity.add(impulse.multiply(this.inverseMass));
    this.angularVelocity += this.inverseInertia * contactPoint.cross(impulse);
  }

  /**
   * Accumulates a continuous force to be applied on the next
   * {@link integrateForces} call, rather than changing velocity
   * immediately. Use this for effects that act over time, such as thrust,
   * wind, or a {@link https://en.wikipedia.org/wiki/Hooke%27s_law spring}.
   * For an instantaneous change, use {@link applyImpulse} instead.
   * @param force - The force to accumulate.
   * @param contactPoint - The point at which to apply the force, relative
   * to the body's center of mass. Defaults to the center of mass, which
   * imparts no torque.
   */
  public applyForce(
    force: Vector2,
    contactPoint: Vector2 = Vector2.zero,
  ): void {
    this._forceAccumulator = this._forceAccumulator.add(force);
    this._torqueAccumulator += contactPoint.cross(force);
  }

  /**
   * Accumulates a continuous torque to be applied on the next
   * {@link integrateForces} call.
   * @param torque - The torque to accumulate.
   */
  public applyTorque(torque: number): void {
    this._torqueAccumulator += torque;
  }

  /**
   * Integrates the accumulated force and torque into `velocity` and
   * `angularVelocity`, then clears both accumulators. Called once per
   * {@link PhysicsWorld} step, alongside gravity integration.
   * @param deltaTimeInSeconds - The amount of time to integrate over, in
   * seconds.
   */
  public integrateForces(deltaTimeInSeconds: number): void {
    this.velocity = this.velocity.add(
      this._forceAccumulator.multiply(this.inverseMass * deltaTimeInSeconds),
    );
    this.angularVelocity +=
      this._torqueAccumulator * this.inverseInertia * deltaTimeInSeconds;

    this._forceAccumulator = Vector2.zero;
    this._torqueAccumulator = 0;
  }
}
