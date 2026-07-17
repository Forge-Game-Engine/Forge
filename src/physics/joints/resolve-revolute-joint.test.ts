import { describe, expect, it } from 'vitest';
import { resolveRevoluteJoint } from './resolve-revolute-joint.js';
import { RevoluteJoint } from './revolute-joint.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

const createBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position });

const createStaticBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position, isStatic: true });

const resolveRepeatedly = (joint: RevoluteJoint, times = 30): void => {
  for (let i = 0; i < times; i++) {
    resolveRevoluteJoint(joint);
  }
};

describe('resolveRevoluteJoint', () => {
  it('cancels relative velocity at the (coincident-anchor) center of mass', () => {
    // With default zero-offset anchors, the anchor point is each body's
    // center of mass, so the point constraint should drive bodyB's velocity
    // to match static bodyA's (zero), same as two bodies pinned center to
    // center.
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(2, 0));
    bodyB.velocity = new Vector2(3, 5);

    const joint = new RevoluteJoint({ bodyA, bodyB });

    resolveRepeatedly(joint);

    expect(bodyB.velocity.x).toBeCloseTo(0, 3);
    expect(bodyB.velocity.y).toBeCloseTo(0, 3);
  });

  it('does not resist relative angular velocity when no limit is enabled', () => {
    const bodyA = createBody(Vector2.zero);
    const bodyB = createBody(new Vector2(2, 0));
    bodyB.angularVelocity = 4;
    bodyA.angularVelocity = -1;

    const joint = new RevoluteJoint({ bodyA, bodyB });

    resolveRevoluteJoint(joint);

    expect(bodyB.angularVelocity).toBeCloseTo(4);
    expect(bodyA.angularVelocity).toBeCloseTo(-1);
  });

  it('corrects positional drift so anchors converge back onto each other', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(2, 0));

    const joint = new RevoluteJoint({
      bodyA,
      bodyB,
      anchorA: new Vector2(1, 0),
    });

    resolveRepeatedly(joint, 200);

    // A small residual within `LINEAR_SLOP` is expected: positional
    // correction only acts once the error exceeds the slop, mirroring
    // `resolveCollision`'s `PENETRATION_SLOP`.
    const anchorA = bodyA.position.add(joint.localAnchorA.rotate(bodyA.angle));
    const anchorB = bodyB.position.add(joint.localAnchorB.rotate(bodyB.angle));

    expect(anchorB.subtract(anchorA).magnitude()).toBeLessThan(0.02);
  });

  it('stops angular velocity that would push angle past the upper limit', () => {
    const bodyA = createBody(Vector2.zero);
    const bodyB = createBody(new Vector2(2, 0));

    const joint = new RevoluteJoint({
      bodyA,
      bodyB,
      enableLimit: true,
      lowerAngle: -1,
      upperAngle: 1,
    });

    // Set the angle to the limit (and a velocity pushing further past it)
    // after construction, so it doesn't affect `referenceAngle`.
    bodyB.angle = 1;
    bodyB.angularVelocity = 6;

    resolveRepeatedly(joint, 60);

    expect(joint.angle).toBeLessThanOrEqual(1.01);
    expect(bodyB.angularVelocity - bodyA.angularVelocity).toBeLessThanOrEqual(
      0.01,
    );
  });

  it('stops angular velocity that would push angle past the lower limit', () => {
    const bodyA = createBody(Vector2.zero);
    const bodyB = createBody(new Vector2(2, 0));

    const joint = new RevoluteJoint({
      bodyA,
      bodyB,
      enableLimit: true,
      lowerAngle: -1,
      upperAngle: 1,
    });

    bodyB.angle = -1;
    bodyB.angularVelocity = -6;

    resolveRepeatedly(joint, 60);

    expect(joint.angle).toBeGreaterThanOrEqual(-1.01);
    expect(
      bodyB.angularVelocity - bodyA.angularVelocity,
    ).toBeGreaterThanOrEqual(-0.01);
  });

  it('leaves both bodies unaffected when both are static', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createStaticBody(new Vector2(2, 0));

    const joint = new RevoluteJoint({ bodyA, bodyB });

    expect(() => resolveRevoluteJoint(joint)).not.toThrow();
    expect(bodyA.position.equals(Vector2.zero)).toBe(true);
    expect(bodyB.position.equals(new Vector2(2, 0))).toBe(true);
  });
});
