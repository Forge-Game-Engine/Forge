import { positionId, Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vec2, Vector2 } from '../../math/index.js';
import {
  ColliderEcsComponent,
  colliderId,
} from '../components/collider-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';
import { applyPointImpulse } from '../joints/apply-point-impulse.js';
import { velocityAtPoint } from '../joints/velocity-at-point.js';
import { getRigidBodyInverseMass } from '../rigid-body-inverse-mass.js';
import { getSoftConstraintParams } from '../solve-soft-constraint.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { ContactConstraint } from '../types/contact-constraint.js';

/**
 * Tuneable coefficients for `createCollisionResolutionEcsSystem`'s solver.
 */
export interface CollisionResolutionOptions {
  /**
   * The number of Gauss-Seidel iterations the solver runs per tick. Box2D
   * recommends a minimum of 4; higher values converge more accurately at a
   * higher cost.
   */
  iterations: number;

  /**
   * The target frequency, in Hz, of the soft constraint used to correct
   * contact penetration. Higher values correct penetration faster at the
   * cost of added stiffness/energy.
   */
  contactHertz: number;

  /**
   * The damping ratio of the soft constraint used to correct contact
   * penetration.
   */
  contactDampingRatio: number;

  /**
   * The maximum speed, in units/second, the penetration-correction bias is
   * allowed to introduce in a single tick.
   */
  maxBiasSpeed: number;

  /**
   * The minimum closing speed (along the contact normal) a new contact must
   * have for restitution to be applied to it.
   */
  restitutionThreshold: number;

  /**
   * The allowed penetration depth (a small slop, as Box2D uses) below which
   * the solver stops trying to correct penetration, to prevent jitter.
   */
  slop: number;
}

const defaultCollisionResolutionOptions: CollisionResolutionOptions = {
  iterations: 10,
  contactHertz: 30,
  contactDampingRatio: 10,
  maxBiasSpeed: 3,
  restitutionThreshold: 1,
  slop: 0.002,
};

interface ActiveContact {
  constraint: ContactConstraint;
  rigidBodyA: RigidBodyEcsComponent | null;
  rigidBodyB: RigidBodyEcsComponent | null;
  invMassA: number;
  invMassB: number;
  invInertiaA: number;
  invInertiaB: number;
  rA: Vector2;
  rB: Vector2;
}

/**
 * Creates an ECS system that resolves every collision in
 * `collisionManifolds` into velocity changes, using a sequential-impulse
 * (Gauss-Seidel) solver with soft-constraint penetration correction,
 * Coulomb friction, and restitution. Warm-starts each contact point's
 * accumulated impulses across ticks via `contactConstraints`, matched up by
 * entity pair and feature id, for fast convergence and stable resting
 * contacts. Must run after whatever system populates `collisionManifolds`
 * (`createNarrowPhaseEcsSystem`) and before whatever system integrates
 * velocity into position (`createEulerIntegrationEcsSystem`).
 * @param collisionManifolds - The narrow-phase system's output: this tick's
 * confirmed collisions.
 * @param contactConstraints - The array the system clears and refills with
 * the current tick's persistent contact solver state. Passing the same
 * array back in on the next tick is what enables warm-starting.
 * @param time - Used to read the tick's delta time.
 * @param options - Tuning overrides for the solver; see
 * {@link CollisionResolutionOptions}.
 * @returns An ECS system that resolves `collisionManifolds` every tick.
 */
export const createCollisionResolutionEcsSystem = (
  collisionManifolds: CollisionManifold[],
  contactConstraints: ContactConstraint[],
  time: Time,
  options: Partial<CollisionResolutionOptions> = {},
): EcsSystem<[]> => {
  const resolvedOptions: CollisionResolutionOptions = {
    ...defaultCollisionResolutionOptions,
    ...options,
  };

  return {
    query: [],
    update: (world) => {
      const nextContactConstraints = buildContactConstraints(
        world,
        collisionManifolds,
        contactConstraints,
      );

      contactConstraints.length = 0;
      contactConstraints.push(...nextContactConstraints);

      const dt = time.deltaTimeInSeconds;

      if (dt <= 0) {
        return;
      }

      const activeContacts: ActiveContact[] = [];

      for (const constraint of contactConstraints) {
        const activeContact = prepareContact(world, constraint);

        if (activeContact !== null) {
          activeContacts.push(activeContact);
        }
      }

      for (const contact of activeContacts) {
        warmStart(contact);
      }

      for (let i = 0; i < resolvedOptions.iterations; i++) {
        for (const contact of activeContacts) {
          solveNormal(contact, dt, resolvedOptions);
          solveFriction(contact);
        }
      }

      for (const contact of activeContacts) {
        applyRestitution(contact, resolvedOptions);
      }
    },
  };
};

function getRequiredCollider(
  world: EcsWorld,
  entity: number,
): ColliderEcsComponent {
  const collider = world.getComponent(entity, colliderId);

  if (collider === null) {
    throw new Error(
      `Unable to resolve collision for entity "${entity}", it no longer has a collider component.`,
    );
  }

  return collider;
}

/**
 * Matches this tick's manifolds up with the previous tick's contact
 * constraints (by entity pair and feature id) to carry accumulated
 * impulses forward, creating fresh constraints for any contact point that
 * has no match.
 */
function buildContactConstraints(
  world: EcsWorld,
  manifolds: CollisionManifold[],
  previousConstraints: ContactConstraint[],
): ContactConstraint[] {
  const remainingPrevious = [...previousConstraints];
  const nextConstraints: ContactConstraint[] = [];

  for (const manifold of manifolds) {
    // Clone before computing the perpendicular: `manifold.normal` is stored
    // (aliased) onto the constraint below, so this must not mutate it.
    const tangent = Vec2.perpendicular(Vec2.clone(manifold.normal));

    for (let i = 0; i < manifold.contactPoints.length; i++) {
      const point = manifold.contactPoints[i];
      const featureId = manifold.featureIds[i];

      const reuseIndex = remainingPrevious.findIndex(
        (candidate) =>
          candidate.entityA === manifold.entityA &&
          candidate.entityB === manifold.entityB &&
          candidate.featureId === featureId,
      );

      if (reuseIndex !== -1) {
        const [reused] = remainingPrevious.splice(reuseIndex, 1);

        reused.isReused = true;
        reused.normal = manifold.normal;
        reused.tangent = tangent;
        reused.point = point;
        reused.penetration = manifold.depth;

        nextConstraints.push(reused);

        continue;
      }

      const colliderA = getRequiredCollider(world, manifold.entityA);
      const colliderB = getRequiredCollider(world, manifold.entityB);

      nextConstraints.push({
        entityA: manifold.entityA,
        entityB: manifold.entityB,
        featureId,
        normal: manifold.normal,
        tangent,
        point,
        penetration: manifold.depth,
        friction: Math.sqrt(colliderA.friction * colliderB.friction),
        restitution: Math.sqrt(colliderA.restitution * colliderB.restitution),
        relativeVelocity: 0,
        accumulatedNormalImpulse: 0,
        accumulatedTangentImpulse: 0,
        isReused: false,
      });
    }
  }

  return nextConstraints;
}

/**
 * Looks up the current tick's bodies for a contact constraint, computing
 * the (inverse) mass/inertia and contact-point offsets the solver needs. An
 * entity with no `RigidBodyEcsComponent`, or one whose
 * `RigidBodyEcsComponent.type` is `'static'`/`'kinematic'`, is treated as
 * having infinite mass (see {@link getRigidBodyInverseMass}).
 */
function prepareContact(
  world: EcsWorld,
  constraint: ContactConstraint,
): ActiveContact | null {
  const positionA = world.getComponent(constraint.entityA, positionId);
  const positionB = world.getComponent(constraint.entityB, positionId);

  if (positionA === null || positionB === null) {
    return null;
  }

  const rigidBodyA = world.getComponent(constraint.entityA, rigidBodyId);
  const rigidBodyB = world.getComponent(constraint.entityB, rigidBodyId);

  const { invMass: invMassA, invInertia: invInertiaA } =
    getRigidBodyInverseMass(rigidBodyA);
  const { invMass: invMassB, invInertia: invInertiaB } =
    getRigidBodyInverseMass(rigidBodyB);

  // Clone before subtracting: `constraint.point` is used for both `rA` and
  // `rB` here, and `positionA.world`/`positionB.world` are the entities'
  // live world position.
  const rA = Vec2.subtract(Vec2.clone(constraint.point), positionA.world);
  const rB = Vec2.subtract(Vec2.clone(constraint.point), positionB.world);

  const relativeVelocity = Vec2.subtract(
    velocityAtPoint(rigidBodyB, rB),
    velocityAtPoint(rigidBodyA, rA),
  );
  constraint.relativeVelocity = Vec2.dot(constraint.normal, relativeVelocity);

  return {
    constraint,
    rigidBodyA,
    rigidBodyB,
    invMassA,
    invMassB,
    invInertiaA,
    invInertiaB,
    rA,
    rB,
  };
}

/**
 * Re-applies a contact's accumulated impulses from the previous tick before
 * this tick's iterative solve begins, so the solver starts close to its
 * previous solution instead of from zero.
 */
function warmStart(contact: ActiveContact): void {
  const {
    constraint,
    rigidBodyA,
    rigidBodyB,
    invMassA,
    invMassB,
    invInertiaA,
    invInertiaB,
    rA,
    rB,
  } = contact;

  // Clone before scaling: `constraint.normal`/`constraint.tangent` persist
  // across the whole tick (read again by every solve iteration below).
  const impulse = Vec2.add(
    Vec2.multiply(
      Vec2.clone(constraint.normal),
      constraint.accumulatedNormalImpulse,
    ),
    Vec2.multiply(
      Vec2.clone(constraint.tangent),
      constraint.accumulatedTangentImpulse,
    ),
  );

  applyPointImpulse(
    rigidBodyA,
    rA,
    invMassA,
    invInertiaA,
    Vec2.negate(Vec2.clone(impulse)),
  );
  applyPointImpulse(rigidBodyB, rB, invMassB, invInertiaB, impulse);
}

function solveNormal(
  contact: ActiveContact,
  dt: number,
  options: CollisionResolutionOptions,
): void {
  const {
    constraint,
    rigidBodyA,
    rigidBodyB,
    invMassA,
    invMassB,
    invInertiaA,
    invInertiaB,
    rA,
    rB,
  } = contact;

  const rnA = Vec2.cross(rA, constraint.normal);
  const rnB = Vec2.cross(rB, constraint.normal);
  const effectiveMass =
    invMassA + invMassB + rnA * rnA * invInertiaA + rnB * rnB * invInertiaB;

  if (effectiveMass < 1e-6) {
    return;
  }

  const relativeVelocity = Vec2.subtract(
    velocityAtPoint(rigidBodyB, rB),
    velocityAtPoint(rigidBodyA, rA),
  );
  const normalVelocity = Vec2.dot(constraint.normal, relativeVelocity);

  const maxHertz = 0.25 / dt;
  const soft = getSoftConstraintParams(
    Math.min(options.contactHertz, maxHertz),
    options.contactDampingRatio,
    dt,
  );

  const separation = Math.min(0, -constraint.penetration + options.slop);
  const bias = Math.max(soft.biasRate * separation, -options.maxBiasSpeed);

  let lambda = -(soft.massScale * normalVelocity + bias) / effectiveMass;
  lambda -= soft.impulseScale * constraint.accumulatedNormalImpulse;

  const newAccumulatedImpulse = Math.max(
    constraint.accumulatedNormalImpulse + lambda,
    0,
  );
  lambda = newAccumulatedImpulse - constraint.accumulatedNormalImpulse;
  constraint.accumulatedNormalImpulse = newAccumulatedImpulse;

  // Clone before scaling: `constraint.normal` persists across the whole
  // tick, read again by every remaining solve iteration.
  const impulse = Vec2.multiply(Vec2.clone(constraint.normal), lambda);

  applyPointImpulse(
    rigidBodyA,
    rA,
    invMassA,
    invInertiaA,
    Vec2.negate(Vec2.clone(impulse)),
  );
  applyPointImpulse(rigidBodyB, rB, invMassB, invInertiaB, impulse);
}

function solveFriction(contact: ActiveContact): void {
  const {
    constraint,
    rigidBodyA,
    rigidBodyB,
    invMassA,
    invMassB,
    invInertiaA,
    invInertiaB,
    rA,
    rB,
  } = contact;

  if (constraint.friction <= 0) {
    return;
  }

  const rtA = Vec2.cross(rA, constraint.tangent);
  const rtB = Vec2.cross(rB, constraint.tangent);
  const effectiveMass =
    invMassA + invMassB + rtA * rtA * invInertiaA + rtB * rtB * invInertiaB;

  if (effectiveMass < 1e-6) {
    return;
  }

  const relativeVelocity = Vec2.subtract(
    velocityAtPoint(rigidBodyB, rB),
    velocityAtPoint(rigidBodyA, rA),
  );
  const tangentVelocity = Vec2.dot(constraint.tangent, relativeVelocity);

  let lambda = -tangentVelocity / effectiveMass;

  const maxFriction = constraint.friction * constraint.accumulatedNormalImpulse;
  const newAccumulatedImpulse = Math.max(
    -maxFriction,
    Math.min(constraint.accumulatedTangentImpulse + lambda, maxFriction),
  );
  lambda = newAccumulatedImpulse - constraint.accumulatedTangentImpulse;
  constraint.accumulatedTangentImpulse = newAccumulatedImpulse;

  // Clone before scaling: `constraint.tangent` persists across the whole
  // tick, read again by every remaining solve iteration.
  const impulse = Vec2.multiply(Vec2.clone(constraint.tangent), lambda);

  applyPointImpulse(
    rigidBodyA,
    rA,
    invMassA,
    invInertiaA,
    Vec2.negate(Vec2.clone(impulse)),
  );
  applyPointImpulse(rigidBodyB, rB, invMassB, invInertiaB, impulse);
}

/**
 * Applies a one-off restitution impulse to a freshly-appeared, fast-closing
 * contact, using the relative velocity sampled before this tick's solve.
 * Reused (already-resting) contacts are skipped so they don't keep
 * bouncing every tick.
 */
function applyRestitution(
  contact: ActiveContact,
  options: CollisionResolutionOptions,
): void {
  const {
    constraint,
    rigidBodyA,
    rigidBodyB,
    invMassA,
    invMassB,
    invInertiaA,
    invInertiaB,
    rA,
    rB,
  } = contact;

  if (constraint.restitution === 0 || constraint.isReused) {
    return;
  }

  if (constraint.relativeVelocity > -options.restitutionThreshold) {
    return;
  }

  const rnA = Vec2.cross(rA, constraint.normal);
  const rnB = Vec2.cross(rB, constraint.normal);
  const effectiveMass =
    invMassA + invMassB + rnA * rnA * invInertiaA + rnB * rnB * invInertiaB;

  if (effectiveMass < 1e-6) {
    return;
  }

  const relativeVelocity = Vec2.subtract(
    velocityAtPoint(rigidBodyB, rB),
    velocityAtPoint(rigidBodyA, rA),
  );
  const normalVelocity = Vec2.dot(constraint.normal, relativeVelocity);

  const lambda =
    -(normalVelocity + constraint.restitution * constraint.relativeVelocity) /
    effectiveMass;

  if (lambda <= 0) {
    return;
  }

  // Clone before scaling: `constraint.normal` persists across the whole
  // tick.
  const impulse = Vec2.multiply(Vec2.clone(constraint.normal), lambda);

  applyPointImpulse(
    rigidBodyA,
    rA,
    invMassA,
    invInertiaA,
    Vec2.negate(Vec2.clone(impulse)),
  );
  applyPointImpulse(rigidBodyB, rB, invMassB, invInertiaB, impulse);
}
