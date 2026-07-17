import { describe, expect, it } from 'vitest';
import { PrismaticJoint } from './prismatic-joint.js';
import { resolvePrismaticJoint } from './resolve-prismatic-joint.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

const createBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position });

const createStaticBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position, isStatic: true });

const resolveRepeatedly = (joint: PrismaticJoint, times = 30): void => {
  for (let i = 0; i < times; i++) {
    resolvePrismaticJoint(joint);
  }
};

describe('resolvePrismaticJoint', () => {
  it('cancels relative velocity perpendicular to the axis without touching axial velocity', () => {
    // bodyA is static so the perpendicular constraint can only be satisfied
    // by cancelling bodyB's velocity directly, rather than also letting
    // bodyA rotate to partially absorb it (which is the physically correct
    // behavior for two dynamic bodies, but harder to assert on directly).
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(2, 0));
    bodyB.velocity = new Vector2(3, 5);

    const joint = new PrismaticJoint({ bodyA, bodyB, axis: Vector2.right });

    resolveRepeatedly(joint);

    expect(bodyB.velocity.y).toBeCloseTo(0, 3);
    expect(bodyB.velocity.x).toBeCloseTo(3, 3);
  });

  it('locks relative angular velocity to zero', () => {
    const bodyA = createBody(Vector2.zero);
    const bodyB = createBody(new Vector2(2, 0));
    bodyB.angularVelocity = 4;
    bodyA.angularVelocity = -1;

    const joint = new PrismaticJoint({ bodyA, bodyB });

    resolveRepeatedly(joint);

    expect(bodyB.angularVelocity - bodyA.angularVelocity).toBeCloseTo(0, 3);
  });

  it('corrects perpendicular positional drift back onto the axis', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(2, 1));

    const joint = new PrismaticJoint({ bodyA, bodyB, axis: Vector2.right });

    resolveRepeatedly(joint, 200);

    // A small residual within `LINEAR_SLOP` is expected: positional
    // correction only acts once the error exceeds the slop, mirroring
    // `resolveCollision`'s `PENETRATION_SLOP`.
    expect(joint.translation).toBeGreaterThan(0);
    expect(bodyB.position.y).toBeCloseTo(0, 1);
  });

  it('does not resist axial velocity when no limit is enabled', () => {
    const bodyA = createBody(Vector2.zero);
    const bodyB = createBody(new Vector2(2, 0));
    bodyB.velocity = new Vector2(6, 0);

    const joint = new PrismaticJoint({ bodyA, bodyB, axis: Vector2.right });

    resolvePrismaticJoint(joint);

    expect(bodyB.velocity.x).toBeCloseTo(6);
  });

  it('stops axial velocity that would push translation past the upper limit', () => {
    const bodyA = createBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));
    bodyB.velocity = new Vector2(6, 0);

    const joint = new PrismaticJoint({
      bodyA,
      bodyB,
      axis: Vector2.right,
      enableLimit: true,
      lowerTranslation: 0,
      upperTranslation: 5,
    });

    resolveRepeatedly(joint, 60);

    expect(joint.translation).toBeLessThanOrEqual(5.01);
    expect(bodyB.velocity.x - bodyA.velocity.x).toBeLessThanOrEqual(0.01);
  });

  it('stops axial velocity that would push translation past the lower limit', () => {
    const bodyA = createBody(Vector2.zero);
    const bodyB = createBody(new Vector2(0, 0));
    bodyB.velocity = new Vector2(-6, 0);

    const joint = new PrismaticJoint({
      bodyA,
      bodyB,
      axis: Vector2.right,
      enableLimit: true,
      lowerTranslation: 0,
      upperTranslation: 5,
    });

    resolveRepeatedly(joint, 60);

    expect(joint.translation).toBeGreaterThanOrEqual(-0.01);
    expect(bodyB.velocity.x - bodyA.velocity.x).toBeGreaterThanOrEqual(-0.01);
  });

  it('leaves both bodies unaffected when both are static', () => {
    const bodyA = new RigidBody({
      shape: new CircleShape(1),
      position: Vector2.zero,
      isStatic: true,
    });
    const bodyB = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(2, 0),
      isStatic: true,
    });

    const joint = new PrismaticJoint({ bodyA, bodyB, axis: Vector2.right });

    expect(() => resolvePrismaticJoint(joint)).not.toThrow();
    expect(bodyA.position.equals(Vector2.zero)).toBe(true);
    expect(bodyB.position.equals(new Vector2(2, 0))).toBe(true);
  });
});
