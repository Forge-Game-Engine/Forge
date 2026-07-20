import { describe, expect, it } from 'vitest';
import { applyLinearSpringForce } from './apply-linear-spring-force.js';
import { LinearSpring } from './linear-spring.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

const createBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position });

const createStaticBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position, isStatic: true });

describe('applyLinearSpringForce', () => {
  it('pulls bodies together when stretched beyond restLength', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(10, 0));

    const spring = new LinearSpring({
      bodyA,
      bodyB,
      restLength: 5,
      stiffness: 10,
    });

    applyLinearSpringForce(spring, 1);

    expect(bodyB.velocity.x).toBeLessThan(0);
    expect(bodyB.velocity.y).toBeCloseTo(0);
  });

  it('pushes bodies apart when compressed below restLength', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(2, 0));

    const spring = new LinearSpring({
      bodyA,
      bodyB,
      restLength: 5,
      stiffness: 10,
    });

    applyLinearSpringForce(spring, 1);

    expect(bodyB.velocity.x).toBeGreaterThan(0);
  });

  it('applies no force when at restLength', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(5, 0));

    const spring = new LinearSpring({
      bodyA,
      bodyB,
      restLength: 5,
      stiffness: 10,
    });

    applyLinearSpringForce(spring, 1);

    expect(bodyB.velocity.equals(Vector2.zero)).toBe(true);
  });

  it('applies equal and opposite impulses to both dynamic bodies', () => {
    const bodyA = createBody(Vector2.zero);
    const bodyB = createBody(new Vector2(10, 0));

    const spring = new LinearSpring({
      bodyA,
      bodyB,
      restLength: 5,
      stiffness: 10,
    });

    applyLinearSpringForce(spring, 1);

    expect(bodyA.velocity.x).toBeCloseTo(-bodyB.velocity.x);
  });

  it('has no effect on static bodies', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createStaticBody(new Vector2(10, 0));

    const spring = new LinearSpring({
      bodyA,
      bodyB,
      restLength: 5,
      stiffness: 10,
    });

    expect(() => applyLinearSpringForce(spring, 1)).not.toThrow();
    expect(bodyA.velocity.equals(Vector2.zero)).toBe(true);
    expect(bodyB.velocity.equals(Vector2.zero)).toBe(true);
  });

  it('scales the force by deltaTimeInSeconds', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(10, 0));

    const spring = new LinearSpring({
      bodyA,
      bodyB,
      restLength: 5,
      stiffness: 10,
    });

    applyLinearSpringForce(spring, 0.5);

    const bodyC = createBody(new Vector2(10, 0));
    const springForBodyC = new LinearSpring({
      bodyA: createStaticBody(Vector2.zero),
      bodyB: bodyC,
      restLength: 5,
      stiffness: 10,
    });

    applyLinearSpringForce(springForBodyC, 1);

    expect(bodyC.velocity.x).toBeCloseTo(bodyB.velocity.x * 2);
  });
});
