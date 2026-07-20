import { describe, expect, it } from 'vitest';
import { LinearSpring } from './linear-spring.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

const createBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position });

describe('LinearSpring', () => {
  it('defaults restLength to the distance between anchors at construction time', () => {
    const bodyA = createBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));

    const spring = new LinearSpring({ bodyA, bodyB, stiffness: 10 });

    expect(spring.restLength).toBeCloseTo(5);
  });

  it('uses an explicit restLength when given', () => {
    const bodyA = createBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));

    const spring = new LinearSpring({
      bodyA,
      bodyB,
      stiffness: 10,
      restLength: 2,
    });

    expect(spring.restLength).toBe(2);
  });

  it('defaults to zero-offset anchors', () => {
    const bodyA = createBody();
    const bodyB = createBody();

    const spring = new LinearSpring({ bodyA, bodyB, stiffness: 10 });

    expect(spring.localAnchorA.equals(Vector2.zero)).toBe(true);
    expect(spring.localAnchorB.equals(Vector2.zero)).toBe(true);
  });

  it('throws when stiffness is negative', () => {
    const bodyA = createBody();
    const bodyB = createBody();

    expect(() => new LinearSpring({ bodyA, bodyB, stiffness: -1 })).toThrow();
  });

  describe('length', () => {
    it('reports the current world-space distance between anchors', () => {
      const bodyA = createBody(Vector2.zero);
      const bodyB = createBody(new Vector2(3, 4));

      const spring = new LinearSpring({ bodyA, bodyB, stiffness: 10 });

      expect(spring.length).toBeCloseTo(5);

      bodyB.position = new Vector2(6, 8);

      expect(spring.length).toBeCloseTo(10);
    });
  });

  describe('worldAnchorA / worldAnchorB', () => {
    it("rotates local anchor offsets by each body's current angle", () => {
      const bodyA = createBody(Vector2.zero);
      bodyA.angle = Math.PI / 2;
      const bodyB = createBody(new Vector2(5, 0));

      const spring = new LinearSpring({
        bodyA,
        bodyB,
        anchorA: new Vector2(1, 0),
        stiffness: 10,
      });

      expect(spring.worldAnchorA.x).toBeCloseTo(0);
      expect(spring.worldAnchorA.y).toBeCloseTo(1);
    });
  });
});
