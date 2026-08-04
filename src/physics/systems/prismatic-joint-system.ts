import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { Vec2, Vector2 } from '../../math/index.js';
import {
  PrismaticJointEcsComponent,
  prismaticJointId,
} from '../components/prismatic-joint-component.js';
import { JointBody, resolveJointBody } from '../joints/resolve-joint-body.js';
import { velocityAtPoint } from '../joints/velocity-at-point.js';
import { getSoftConstraintParams } from '../solve-soft-constraint.js';

/**
 * Tuneable coefficients for `createPrismaticJointEcsSystem`'s solver.
 */
export interface PrismaticJointSystemOptions {
  /**
   * The number of velocity-solve iterations run per joint, per tick. See
   * `RevoluteJointSystemOptions.iterations` for the same rationale.
   */
  iterations: number;
}

const defaultPrismaticJointSystemOptions: PrismaticJointSystemOptions = {
  iterations: 1,
};

interface PreparedPrismaticJoint {
  joint: PrismaticJointEcsComponent;
  bodyA: JointBody;
  bodyB: JointBody;
  rA: Vector2;
  rB: Vector2;
  axis: Vector2;
  perp: Vector2;
  s1: number;
  s2: number;
  a1: number;
  a2: number;
  effMassPerp: number;
  effMassAngular: number;
  effMassLimit: number;
  perpSeparation: number;
  angleError: number;
  translation: number;
}

/**
 * Creates an ECS system that resolves every `PrismaticJointEcsComponent`,
 * constraining each joint's `entityB` to slide relative to `entityA` only
 * along the joint's axis (and locking their relative rotation), using the
 * same warm-started, soft-constraint velocity solve as
 * `createCollisionResolutionEcsSystem`'s contact resolution. Must run after
 * `createCollisionResolutionEcsSystem` and before whatever system
 * integrates velocity into position (`createEulerIntegrationEcsSystem`).
 * @param time - Used to read the tick's delta time.
 * @param options - Tuning overrides for the solver; see
 * {@link PrismaticJointSystemOptions}.
 * @returns An ECS system that resolves every `PrismaticJointEcsComponent`
 * every tick.
 */
export const createPrismaticJointEcsSystem = (
  time: Time,
  options: Partial<PrismaticJointSystemOptions> = {},
): EcsSystem<[PrismaticJointEcsComponent]> => {
  const resolvedOptions: PrismaticJointSystemOptions = {
    ...defaultPrismaticJointSystemOptions,
    ...options,
  };

  return {
    query: [prismaticJointId],
    update: (world, { components: [joints] }) => {
      const dt = time.deltaTimeInSeconds;

      if (dt <= 0) {
        return;
      }

      const prepared: PreparedPrismaticJoint[] = [];

      for (const joint of joints) {
        const bodyA = resolveJointBody(world, joint.entityA);
        const bodyB = resolveJointBody(world, joint.entityB);

        if (bodyA === null || bodyB === null) {
          continue;
        }

        prepared.push(prepareJoint(joint, bodyA, bodyB));
      }

      for (const joint of prepared) {
        warmStart(joint);
      }

      for (let i = 0; i < resolvedOptions.iterations; i++) {
        for (const joint of prepared) {
          solvePerpendicular(joint, dt);
          solveAngular(joint, dt);
          solveLimit(joint, dt);
        }
      }
    },
  };
};

function prepareJoint(
  joint: PrismaticJointEcsComponent,
  bodyA: JointBody,
  bodyB: JointBody,
): PreparedPrismaticJoint {
  // Clone before rotating: `joint.localAnchorA`/`localAnchorB`/`axis` are
  // persistent component fields reused every tick.
  const rA = Vec2.rotate(Vec2.clone(joint.localAnchorA), bodyA.rotation);
  const rB = Vec2.rotate(Vec2.clone(joint.localAnchorB), bodyB.rotation);
  const axis = Vec2.rotate(Vec2.clone(joint.axis), bodyA.rotation);
  // Clone before computing the perpendicular: `axis` is reused for the rest
  // of this tick (stored on `PreparedPrismaticJoint`).
  const perp = Vec2.perpendicular(Vec2.clone(axis));

  // Clone before adding: `bodyB.position`/`bodyA.position` are the entities'
  // live world position.
  const d = Vec2.subtract(
    Vec2.subtract(Vec2.add(Vec2.clone(bodyB.position), rB), bodyA.position),
    rA,
  );

  // Compute `d + rA` once and reuse it for both `s1`/`a1`: `d` is read again
  // below (`perpSeparation`/`translation`), so it must not be mutated, and
  // computing it twice would double-add `rA` under in-place addition.
  const dPlusRA = Vec2.add(Vec2.clone(d), rA);
  const s1 = Vec2.cross(dPlusRA, perp);
  const s2 = Vec2.cross(rB, perp);
  const a1 = Vec2.cross(dPlusRA, axis);
  const a2 = Vec2.cross(rB, axis);

  const effMassPerp =
    bodyA.invMass +
    bodyB.invMass +
    bodyA.invInertia * s1 * s1 +
    bodyB.invInertia * s2 * s2;
  const effMassAngular = bodyA.invInertia + bodyB.invInertia;
  const effMassLimit =
    bodyA.invMass +
    bodyB.invMass +
    bodyA.invInertia * a1 * a1 +
    bodyB.invInertia * a2 * a2;

  return {
    joint,
    bodyA,
    bodyB,
    rA,
    rB,
    axis,
    perp,
    s1,
    s2,
    a1,
    a2,
    effMassPerp,
    effMassAngular,
    effMassLimit,
    perpSeparation: Vec2.dot(d, perp),
    angleError: bodyB.rotation - bodyA.rotation - joint.referenceAngle,
    translation: Vec2.dot(d, axis),
  };
}

function relativeVelocity(prepared: PreparedPrismaticJoint): Vector2 {
  return Vec2.subtract(
    velocityAtPoint(prepared.bodyB.rigidBody, prepared.rB),
    velocityAtPoint(prepared.bodyA.rigidBody, prepared.rA),
  );
}

function applyAxisImpulse(
  prepared: PreparedPrismaticJoint,
  axisVector: Vector2,
  coefficientA: number,
  coefficientB: number,
  lambda: number,
): void {
  const { bodyA, bodyB } = prepared;
  // Clone before scaling: `axisVector` (`perp`/`axis`) persists across the
  // whole tick, reused by every remaining solve iteration.
  const impulse = Vec2.multiply(Vec2.clone(axisVector), lambda);

  if (bodyA.rigidBody !== null) {
    // Clone before scaling: `impulse` is reused for bodyB right after.
    Vec2.subtract(
      bodyA.rigidBody.velocity,
      Vec2.multiply(Vec2.clone(impulse), bodyA.invMass),
    );
    bodyA.rigidBody.angularVelocity -= bodyA.invInertia * coefficientA * lambda;
  }

  if (bodyB.rigidBody !== null) {
    Vec2.add(
      bodyB.rigidBody.velocity,
      Vec2.multiply(Vec2.clone(impulse), bodyB.invMass),
    );
    bodyB.rigidBody.angularVelocity += bodyB.invInertia * coefficientB * lambda;
  }
}

function warmStart(prepared: PreparedPrismaticJoint): void {
  const { joint, perp } = prepared;

  applyAxisImpulse(
    prepared,
    perp,
    prepared.s1,
    prepared.s2,
    joint.accumulatedPerpImpulse,
  );

  const { bodyA, bodyB } = prepared;

  if (bodyA.rigidBody !== null) {
    bodyA.rigidBody.angularVelocity -=
      bodyA.invInertia * joint.accumulatedAngularImpulse;
  }

  if (bodyB.rigidBody !== null) {
    bodyB.rigidBody.angularVelocity +=
      bodyB.invInertia * joint.accumulatedAngularImpulse;
  }
}

function solvePerpendicular(
  prepared: PreparedPrismaticJoint,
  dt: number,
): void {
  const { joint, perp, s1, s2, effMassPerp, perpSeparation } = prepared;

  if (effMassPerp < 1e-6) {
    return;
  }

  const relVel = relativeVelocity(prepared);
  const velocityError =
    Vec2.dot(relVel, perp) +
    s2 * (prepared.bodyB.rigidBody?.angularVelocity ?? 0) -
    s1 * (prepared.bodyA.rigidBody?.angularVelocity ?? 0);

  const maxHertz = 0.25 / dt;
  const soft = getSoftConstraintParams(
    Math.min(joint.hertz, maxHertz),
    joint.dampingRatio,
    dt,
  );
  const bias = soft.biasRate * perpSeparation;

  // See revolute-joint-system.ts's solvePoint for why the impulseScale
  // decay term isn't divided by effMassPerp.
  const lambda =
    -(soft.massScale * velocityError + bias) / effMassPerp -
    soft.impulseScale * joint.accumulatedPerpImpulse;

  joint.accumulatedPerpImpulse += lambda;

  applyAxisImpulse(prepared, perp, s1, s2, lambda);
}

function solveAngular(prepared: PreparedPrismaticJoint, dt: number): void {
  const { joint, bodyA, bodyB, effMassAngular, angleError } = prepared;

  if (effMassAngular < 1e-6) {
    return;
  }

  const velocityError =
    (bodyB.rigidBody?.angularVelocity ?? 0) -
    (bodyA.rigidBody?.angularVelocity ?? 0);

  const maxHertz = 0.25 / dt;
  const soft = getSoftConstraintParams(
    Math.min(joint.hertz, maxHertz),
    joint.dampingRatio,
    dt,
  );
  const bias = soft.biasRate * angleError;

  // See revolute-joint-system.ts's solvePoint for why the impulseScale
  // decay term isn't divided by effMassAngular.
  const lambda =
    -(soft.massScale * velocityError + bias) / effMassAngular -
    soft.impulseScale * joint.accumulatedAngularImpulse;

  joint.accumulatedAngularImpulse += lambda;

  if (bodyA.rigidBody !== null) {
    bodyA.rigidBody.angularVelocity -= bodyA.invInertia * lambda;
  }

  if (bodyB.rigidBody !== null) {
    bodyB.rigidBody.angularVelocity += bodyB.invInertia * lambda;
  }
}

/**
 * Solves the (optional) translation-limit constraint. Not warm-started, for
 * the same reason `revolute-joint-system.ts`'s angle limit isn't: see that
 * file's `solveLimit` doc comment.
 */
function solveLimit(prepared: PreparedPrismaticJoint, dt: number): void {
  const { joint, axis, a1, a2, effMassLimit, translation } = prepared;

  if (!joint.enableLimit || effMassLimit < 1e-6) {
    return;
  }

  let separation: number;

  if (translation <= joint.lowerTranslation) {
    separation = translation - joint.lowerTranslation;
  } else if (translation >= joint.upperTranslation) {
    separation = translation - joint.upperTranslation;
  } else {
    return;
  }

  const relVel = relativeVelocity(prepared);
  const velocityError =
    Vec2.dot(relVel, axis) +
    a2 * (prepared.bodyB.rigidBody?.angularVelocity ?? 0) -
    a1 * (prepared.bodyA.rigidBody?.angularVelocity ?? 0);

  const maxHertz = 0.25 / dt;
  const soft = getSoftConstraintParams(
    Math.min(joint.hertz, maxHertz),
    joint.dampingRatio,
    dt,
  );
  const bias = soft.biasRate * separation;

  let lambda = -(soft.massScale * velocityError + bias) / effMassLimit;
  lambda = separation > 0 ? Math.min(lambda, 0) : Math.max(lambda, 0);

  applyAxisImpulse(prepared, axis, a1, a2, lambda);
}
