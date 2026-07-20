import { describe, expect, it } from 'vitest';
import { applyLinearDamperForce } from './apply-linear-damper-force.js';
import { LinearDamper } from './linear-damper.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

const createBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position });

const createStaticBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position, isStatic: true });

describe('applyLinearDamperForce', () => {
  it('resists bodies moving apart (extension)', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));
    bodyB.velocity = new Vector2(3, 0);

    const damper = new LinearDamper({
      bodyA,
      bodyB,
      dampingCoefficient: 1,
    });

    applyLinearDamperForce(damper, 1);

    expect(bodyB.velocity.x).toBeLessThan(3);
  });

  it('resists bodies moving together (compression)', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));
    bodyB.velocity = new Vector2(-3, 0);

    const damper = new LinearDamper({
      bodyA,
      bodyB,
      dampingCoefficient: 1,
    });

    applyLinearDamperForce(damper, 1);

    expect(bodyB.velocity.x).toBeGreaterThan(-3);
  });

  it('ignores relative velocity perpendicular to the anchor line', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));
    bodyB.velocity = new Vector2(0, 3);

    const damper = new LinearDamper({
      bodyA,
      bodyB,
      dampingCoefficient: 1,
    });

    applyLinearDamperForce(damper, 1);

    expect(bodyB.velocity.y).toBeCloseTo(3);
  });

  it('applies no force when there is no relative velocity', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));

    const damper = new LinearDamper({
      bodyA,
      bodyB,
      dampingCoefficient: 1,
    });

    applyLinearDamperForce(damper, 1);

    expect(bodyB.velocity.equals(Vector2.zero)).toBe(true);
  });

  it('applies equal and opposite impulses to both dynamic bodies', () => {
    const bodyA = createBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));
    bodyB.velocity = new Vector2(3, 0);

    const damper = new LinearDamper({
      bodyA,
      bodyB,
      dampingCoefficient: 1,
    });

    applyLinearDamperForce(damper, 1);

    const changeInB = bodyB.velocity.x - 3;
    const changeInA = bodyA.velocity.x - 0;

    expect(changeInA).toBeCloseTo(-changeInB);
  });

  it('has no effect on static bodies', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createStaticBody(new Vector2(5, 0));

    const damper = new LinearDamper({
      bodyA,
      bodyB,
      dampingCoefficient: 1,
    });

    expect(() => applyLinearDamperForce(damper, 1)).not.toThrow();
    expect(bodyA.velocity.equals(Vector2.zero)).toBe(true);
    expect(bodyB.velocity.equals(Vector2.zero)).toBe(true);
  });
});
