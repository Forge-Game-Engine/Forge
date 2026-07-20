import { describe, expect, it } from 'vitest';
import { LinearDamper } from './linear-damper.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

const createBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position });

describe('LinearDamper', () => {
  it('defaults to zero-offset anchors', () => {
    const bodyA = createBody();
    const bodyB = createBody();

    const damper = new LinearDamper({ bodyA, bodyB, dampingCoefficient: 5 });

    expect(damper.localAnchorA.equals(Vector2.zero)).toBe(true);
    expect(damper.localAnchorB.equals(Vector2.zero)).toBe(true);
  });

  it('throws when dampingCoefficient is negative', () => {
    const bodyA = createBody();
    const bodyB = createBody();

    expect(
      () => new LinearDamper({ bodyA, bodyB, dampingCoefficient: -1 }),
    ).toThrow();
  });

  describe('length', () => {
    it('reports the current world-space distance between anchors', () => {
      const bodyA = createBody(Vector2.zero);
      const bodyB = createBody(new Vector2(3, 4));

      const damper = new LinearDamper({
        bodyA,
        bodyB,
        dampingCoefficient: 5,
      });

      expect(damper.length).toBeCloseTo(5);
    });
  });

  describe('worldAnchorA / worldAnchorB', () => {
    it("rotates local anchor offsets by each body's current angle", () => {
      const bodyA = createBody(Vector2.zero);
      bodyA.angle = Math.PI / 2;
      const bodyB = createBody(new Vector2(5, 0));

      const damper = new LinearDamper({
        bodyA,
        bodyB,
        anchorA: new Vector2(1, 0),
        dampingCoefficient: 5,
      });

      expect(damper.worldAnchorA.x).toBeCloseTo(0);
      expect(damper.worldAnchorA.y).toBeCloseTo(1);
    });
  });
});
