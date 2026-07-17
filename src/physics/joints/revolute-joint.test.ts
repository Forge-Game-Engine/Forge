import { describe, expect, it } from 'vitest';
import { RevoluteJoint } from './revolute-joint.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

const createBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position });

describe('RevoluteJoint', () => {
  it('defaults to zero-offset anchors and a disabled limit', () => {
    const bodyA = createBody();
    const bodyB = createBody();

    const joint = new RevoluteJoint({ bodyA, bodyB });

    expect(joint.localAnchorA.equals(Vector2.zero)).toBe(true);
    expect(joint.localAnchorB.equals(Vector2.zero)).toBe(true);
    expect(joint.enableLimit).toBe(false);
  });

  it('captures the relative angle between the bodies as the reference angle', () => {
    const bodyA = createBody();
    bodyA.angle = 0.3;
    const bodyB = createBody();
    bodyB.angle = 1.1;

    const joint = new RevoluteJoint({ bodyA, bodyB });

    expect(joint.referenceAngle).toBeCloseTo(0.8);
  });

  it('throws when lowerAngle is greater than upperAngle', () => {
    const bodyA = createBody();
    const bodyB = createBody();

    expect(
      () =>
        new RevoluteJoint({
          bodyA,
          bodyB,
          enableLimit: true,
          lowerAngle: 1,
          upperAngle: -1,
        }),
    ).toThrow();
  });

  describe('angle', () => {
    it('is zero right after construction', () => {
      const bodyA = createBody();
      bodyA.angle = 0.3;
      const bodyB = createBody();
      bodyB.angle = 1.1;

      const joint = new RevoluteJoint({ bodyA, bodyB });

      expect(joint.angle).toBeCloseTo(0);
    });

    it('reports rotation relative to the reference angle', () => {
      const bodyA = createBody();
      const bodyB = createBody();

      const joint = new RevoluteJoint({ bodyA, bodyB });

      bodyB.angle = 0.5;

      expect(joint.angle).toBeCloseTo(0.5);
    });
  });

  describe('anchor', () => {
    it('is the midpoint of both bodies world-space anchors', () => {
      const bodyA = createBody(new Vector2(0, 0));
      const bodyB = createBody(new Vector2(4, 0));

      const joint = new RevoluteJoint({ bodyA, bodyB });

      expect(joint.anchor.equals(new Vector2(2, 0))).toBe(true);
    });

    it('accounts for local anchor offsets rotated by each body angle', () => {
      const bodyA = createBody(Vector2.zero);
      bodyA.angle = Math.PI / 2;
      const bodyB = createBody(Vector2.zero);

      const joint = new RevoluteJoint({
        bodyA,
        bodyB,
        anchorA: new Vector2(1, 0),
      });

      expect(joint.anchor.x).toBeCloseTo(0);
      expect(joint.anchor.y).toBeCloseTo(0.5);
    });
  });
});
