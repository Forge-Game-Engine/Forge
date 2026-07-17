import { Vector2 } from '../math/index.js';
import {
  type CollisionManifold,
  detectCollision,
  resolveCollision,
} from './collision/index.js';
import { type Joint, resolveJoint } from './joints/index.js';
import type { RigidBody } from './rigid-body.js';

/**
 * Options for creating a {@link PhysicsWorld}.
 */
export interface PhysicsWorldOptions {
  /**
   * The acceleration applied to all dynamic bodies every step.
   */
  gravity?: Vector2;
}

const defaultPhysicsWorldOptions = {
  gravity: Vector2.zero,
};

/**
 * The number of times collision resolution is repeated each step over the
 * same set of contacts. Repeating the impulse and positional correction
 * passes lets resting contacts in stacks/piles converge towards zero
 * penetration within a single step, without re-running broad/narrow-phase
 * detection.
 */
const SOLVER_ITERATIONS = 8;

/**
 * Multiplier applied to the per-step gravity-induced velocity change to
 * derive the resting velocity threshold passed to {@link resolveCollision}.
 * Each step, gravity adds `gravity.magnitude() * deltaTimeInSeconds` to the
 * normal velocity of a resting contact; restitution must be suppressed below
 * that magnitude (with margin for solver iteration) or the contact bounces
 * back out by the same amount every step, causing resting piles to visibly
 * vibrate indefinitely.
 */
const RESTING_VELOCITY_THRESHOLD_MULTIPLIER = 2;

/**
 * A pair of {@link RigidBody} instances that are currently colliding.
 */
export interface BodyCollisionPair {
  /**
   * The first body in the colliding pair.
   */
  readonly bodyA: RigidBody;

  /**
   * The second body in the colliding pair.
   */
  readonly bodyB: RigidBody;
}

function pairKeyFor(bodyA: RigidBody, bodyB: RigidBody): string {
  const [lowId, highId] =
    bodyA.id < bodyB.id ? [bodyA.id, bodyB.id] : [bodyB.id, bodyA.id];

  return `${lowId}-${highId}`;
}

/**
 * A native 2D physics simulation containing {@link RigidBody} instances.
 * Each {@link step} integrates motion, applies gravity, and detects and
 * resolves collisions between bodies.
 */
export class PhysicsWorld {
  public gravity: Vector2;

  private readonly _bodies: Set<RigidBody>;

  private readonly _joints: Set<Joint>;

  private _activePairs: Map<string, BodyCollisionPair>;

  private _collisionStarts: BodyCollisionPair[];

  private _collisionEnds: BodyCollisionPair[];

  /**
   * Creates a new PhysicsWorld instance.
   * @param options - The options for the world.
   */
  constructor(options: PhysicsWorldOptions = {}) {
    const { gravity } = { ...defaultPhysicsWorldOptions, ...options };

    this.gravity = gravity.clone();
    this._bodies = new Set();
    this._joints = new Set();
    this._activePairs = new Map();
    this._collisionStarts = [];
    this._collisionEnds = [];
  }

  /**
   * The bodies currently registered in this world.
   */
  get bodies(): readonly RigidBody[] {
    return [...this._bodies];
  }

  /**
   * The joints currently registered in this world.
   */
  get joints(): readonly Joint[] {
    return [...this._joints];
  }

  /**
   * The pairs of bodies that started colliding during the most recent
   * {@link step}.
   */
  get collisionStarts(): readonly BodyCollisionPair[] {
    return this._collisionStarts;
  }

  /**
   * The pairs of bodies that stopped colliding during the most recent
   * {@link step}.
   */
  get collisionEnds(): readonly BodyCollisionPair[] {
    return this._collisionEnds;
  }

  /**
   * Registers a body with this world.
   * @param body - The body to add.
   */
  public addBody(body: RigidBody): void {
    this._bodies.add(body);
  }

  /**
   * Removes a body from this world.
   * @param body - The body to remove.
   * @throws An error if the body is not registered in this world.
   */
  public removeBody(body: RigidBody): void {
    if (!this._bodies.has(body)) {
      throw new Error(
        `Cannot remove RigidBody "${body.id}" that is not registered in this PhysicsWorld.`,
      );
    }

    this._bodies.delete(body);
  }

  /**
   * Registers a joint with this world.
   * @param joint - The joint to add.
   */
  public addJoint(joint: Joint): void {
    this._joints.add(joint);
  }

  /**
   * Removes a joint from this world.
   * @param joint - The joint to remove.
   * @throws An error if the joint is not registered in this world.
   */
  public removeJoint(joint: Joint): void {
    if (!this._joints.has(joint)) {
      throw new Error(
        'Cannot remove joint that is not registered in this PhysicsWorld.',
      );
    }

    this._joints.delete(joint);
  }

  /**
   * Advances the simulation by a fixed time step: integrates velocities and
   * positions for dynamic bodies, then detects and resolves collisions.
   * @param deltaTimeInSeconds - The amount of time to step the simulation
   * by, in seconds.
   */
  public step(deltaTimeInSeconds: number): void {
    this._integrateVelocities(deltaTimeInSeconds);
    this._integratePositions(deltaTimeInSeconds);
    this._detectAndResolveCollisions(deltaTimeInSeconds);
  }

  /**
   * Applies a radial impulse to every non-static body within `radius` of
   * `center`, simulating an explosion. The impulse magnitude falls off
   * linearly from `force` at `center` to zero at `radius`, and is applied
   * through each body's center of mass so no torque is imparted. Static
   * bodies and bodies at or beyond `radius` are unaffected.
   * @param center - The world-space origin of the explosion.
   * @param force - The impulse magnitude applied to a body located at
   * `center`.
   * @param radius - The distance from `center` beyond which bodies are
   * unaffected.
   */
  public applyExplosiveForce(
    center: Vector2,
    force: number,
    radius: number,
  ): void {
    for (const body of this._bodies) {
      if (body.isStatic) {
        continue;
      }

      const offset = body.position.subtract(center);
      const distance = offset.magnitude();

      if (distance >= radius) {
        continue;
      }

      const falloff = 1 - distance / radius;
      const impulse = offset.normalize().multiply(force * falloff);

      body.applyImpulse(impulse, Vector2.zero);
    }
  }

  private _integrateVelocities(deltaTimeInSeconds: number): void {
    for (const body of this._bodies) {
      if (body.isStatic) {
        continue;
      }

      body.velocity = body.velocity.add(
        this.gravity.multiply(deltaTimeInSeconds),
      );
    }
  }

  private _integratePositions(deltaTimeInSeconds: number): void {
    for (const body of this._bodies) {
      if (body.isStatic) {
        continue;
      }

      body.position = body.position.add(
        body.velocity.multiply(deltaTimeInSeconds),
      );
      body.angle += body.angularVelocity * deltaTimeInSeconds;
    }
  }

  private _detectAndResolveCollisions(deltaTimeInSeconds: number): void {
    const bodies = [...this._bodies];
    const currentPairs = new Map<string, BodyCollisionPair>();
    const manifolds: CollisionManifold[] = [];

    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        this._collideBodyPair(bodies[i], bodies[j], currentPairs, manifolds);
      }
    }

    const restingVelocityThreshold =
      this.gravity.magnitude() *
      deltaTimeInSeconds *
      RESTING_VELOCITY_THRESHOLD_MULTIPLIER;

    // Joints are solved in the same iterative pass as contacts (rather than
    // in a separate loop after) so a jointed body that is also touching
    // something else - a piston pushing into a wall, a platform resting on
    // the floor - converges against both constraints together instead of
    // one undoing the other's correction from the previous step.
    for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration++) {
      for (const manifold of manifolds) {
        resolveCollision(
          manifold,
          restingVelocityThreshold,
          iteration === 0,
          iteration % 2 === 1,
        );
      }

      for (const joint of this._joints) {
        resolveJoint(joint);
      }
    }

    this._collisionStarts = [...currentPairs.entries()]
      .filter(([key]) => !this._activePairs.has(key))
      .map(([, pair]) => pair);

    this._collisionEnds = [...this._activePairs.entries()]
      .filter(([key]) => !currentPairs.has(key))
      .map(([, pair]) => pair);

    this._activePairs = currentPairs;
  }

  private _collideBodyPair(
    bodyA: RigidBody,
    bodyB: RigidBody,
    currentPairs: Map<string, BodyCollisionPair>,
    manifolds: CollisionManifold[],
  ): void {
    if (bodyA.isStatic && bodyB.isStatic) {
      return;
    }

    if (!bodyA.aabb.intersects(bodyB.aabb)) {
      return;
    }

    const manifold = detectCollision(bodyA, bodyB);

    if (manifold === null) {
      return;
    }

    if (!bodyA.isSensor && !bodyB.isSensor) {
      manifolds.push(manifold);
    }

    currentPairs.set(pairKeyFor(bodyA, bodyB), { bodyA, bodyB });
  }
}
