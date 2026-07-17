import { describe, expect, it } from 'vitest';
import { PrismaticJoint } from './prismatic-joint.js';
import { resolveJoint } from './resolve-joint.js';
import { RevoluteJoint } from './revolute-joint.js';
import { Vector2 } from '../../math/index.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

const createBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position });

const createStaticBody = (position: Vector2 = Vector2.zero): RigidBody =>
  new RigidBody({ shape: new CircleShape(1), position, isStatic: true });

describe('resolveJoint', () => {
  it('dispatches a PrismaticJoint to resolvePrismaticJoint', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(2, 1));
    bodyB.velocity = new Vector2(0, 5);

    const joint = new PrismaticJoint({ bodyA, bodyB, axis: Vector2.right });

    for (let i = 0; i < 30; i++) {
      resolveJoint(joint);
    }

    expect(bodyB.velocity.y).toBeCloseTo(0, 3);
  });

  it('dispatches a RevoluteJoint to resolveRevoluteJoint', () => {
    const bodyA = createStaticBody(Vector2.zero);
    const bodyB = createBody(new Vector2(2, 0));
    bodyB.velocity = new Vector2(3, 5);

    const joint = new RevoluteJoint({ bodyA, bodyB });

    for (let i = 0; i < 30; i++) {
      resolveJoint(joint);
    }

    expect(bodyB.velocity.x).toBeCloseTo(0, 1);
    expect(bodyB.velocity.y).toBeCloseTo(0, 1);
  });
});
