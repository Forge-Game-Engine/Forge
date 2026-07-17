import { describe, expect, it } from 'vitest';
import { PrismaticJoint } from './prismatic-joint.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

const createBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position });

describe('PrismaticJoint', () => {
  it('normalizes a non-unit axis', () => {
    const bodyA = createBody();
    const bodyB = createBody();

    const joint = new PrismaticJoint({
      bodyA,
      bodyB,
      axis: new Vector2(5, 0),
    });

    expect(joint.localAxisA.magnitude()).toBeCloseTo(1);
    expect(joint.localAxisA.equals(Vector2.right)).toBe(true);
  });

  it('defaults to a horizontal axis and zero-offset anchors', () => {
    const bodyA = createBody();
    const bodyB = createBody();

    const joint = new PrismaticJoint({ bodyA, bodyB });

    expect(joint.localAxisA.equals(Vector2.right)).toBe(true);
    expect(joint.localAnchorA.equals(Vector2.zero)).toBe(true);
    expect(joint.localAnchorB.equals(Vector2.zero)).toBe(true);
    expect(joint.enableLimit).toBe(false);
  });

  it('captures the relative angle between the bodies as the reference angle', () => {
    const bodyA = createBody();
    bodyA.angle = 0.3;
    const bodyB = createBody();
    bodyB.angle = 1.1;

    const joint = new PrismaticJoint({ bodyA, bodyB });

    expect(joint.referenceAngle).toBeCloseTo(0.8);
  });

  it('throws when axis is the zero vector', () => {
    const bodyA = createBody();
    const bodyB = createBody();

    expect(
      () => new PrismaticJoint({ bodyA, bodyB, axis: Vector2.zero }),
    ).toThrow();
  });

  it('throws when lowerTranslation is greater than upperTranslation', () => {
    const bodyA = createBody();
    const bodyB = createBody();

    expect(
      () =>
        new PrismaticJoint({
          bodyA,
          bodyB,
          enableLimit: true,
          lowerTranslation: 10,
          upperTranslation: -10,
        }),
    ).toThrow();
  });

  describe('translation', () => {
    it('reports the signed distance between anchors along the world-space axis', () => {
      const bodyA = createBody(Vector2.zero);
      const bodyB = createBody(new Vector2(5, 0));

      const joint = new PrismaticJoint({ bodyA, bodyB });

      expect(joint.translation).toBeCloseTo(5);
    });

    it('ignores displacement perpendicular to the axis', () => {
      const bodyA = createBody(Vector2.zero);
      const bodyB = createBody(new Vector2(5, 3));

      const joint = new PrismaticJoint({ bodyA, bodyB, axis: Vector2.right });

      expect(joint.translation).toBeCloseTo(5);
    });
  });

  describe('axis', () => {
    it('rotates with bodyA', () => {
      const bodyA = createBody();
      bodyA.angle = Math.PI / 2;
      const bodyB = createBody();

      const joint = new PrismaticJoint({ bodyA, bodyB, axis: Vector2.right });

      expect(joint.axis.x).toBeCloseTo(0);
      expect(joint.axis.y).toBeCloseTo(1);
    });
  });
});
