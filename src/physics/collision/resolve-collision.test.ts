import { describe, expect, it } from 'vitest';
import { resolveCollision } from './resolve-collision.js';
import type { CollisionManifold } from './collision-manifold.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape, PolygonShape } from '../shapes/index.js';
import { Vector2 } from '../../math/index.js';

describe('resolveCollision', () => {
  it('should reflect a falling body off a static body and correct penetration', () => {
    const fallingBody = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, 0),
      restitution: 0.5,
    });
    fallingBody.velocity = new Vector2(0, 5);

    const groundBody = new RigidBody({
      shape: PolygonShape.rectangle(10, 2),
      position: new Vector2(0, 1.5),
      isStatic: true,
      restitution: 0.5,
    });

    const manifold: CollisionManifold = {
      bodyA: fallingBody,
      bodyB: groundBody,
      normal: Vector2.down,
      depth: 0.3,
      contactPoints: [new Vector2(0, 1)],
    };

    resolveCollision(manifold, 0, true);

    expect(fallingBody.velocity.x).toBeCloseTo(0);
    expect(fallingBody.velocity.y).toBeCloseTo(-2.5);
    expect(fallingBody.angularVelocity).toBeCloseTo(0);
    expect(fallingBody.position.y).toBeCloseTo(-0.058);
    expect(groundBody.velocity.equals(Vector2.zero)).toBe(true);
    expect(groundBody.position.equals(new Vector2(0, 1.5))).toBe(true);
  });

  it('should conserve momentum for a head-on collision between equal masses', () => {
    const bodyA = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, 0),
      restitution: 1,
    });
    bodyA.velocity = new Vector2(5, 0);

    const bodyB = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(2, 0),
      restitution: 1,
    });
    bodyB.velocity = new Vector2(-5, 0);

    const manifold: CollisionManifold = {
      bodyA,
      bodyB,
      normal: new Vector2(1, 0),
      depth: 0,
      contactPoints: [new Vector2(1, 0)],
    };

    resolveCollision(manifold, 0, true);

    expect(bodyA.velocity.x).toBeCloseTo(-5);
    expect(bodyA.velocity.y).toBeCloseTo(0);
    expect(bodyB.velocity.x).toBeCloseTo(5);
    expect(bodyB.velocity.y).toBeCloseTo(0);
  });

  it('should reduce tangential velocity due to friction', () => {
    const slidingBody = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, 0),
      restitution: 0,
      friction: 0.5,
    });
    slidingBody.velocity = new Vector2(3, 4);
    const groundBody = new RigidBody({
      shape: PolygonShape.rectangle(10, 2),
      position: new Vector2(0, 2),
      isStatic: true,
      friction: 0.5,
    });

    const manifold: CollisionManifold = {
      bodyA: slidingBody,
      bodyB: groundBody,
      normal: Vector2.down,
      depth: 0,
      contactPoints: [new Vector2(0, 1)],
    };

    resolveCollision(manifold, 0, true);

    expect(slidingBody.velocity.x).toBeCloseTo(2);
    expect(slidingBody.velocity.y).toBeCloseTo(0);
    expect(slidingBody.angularVelocity).toBeCloseTo(2);
  });

  it('should not apply an impulse when bodies are already separating', () => {
    const bodyA = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, 0),
    });
    bodyA.velocity = new Vector2(0, -5);

    const bodyB = new RigidBody({
      shape: PolygonShape.rectangle(10, 2),
      position: new Vector2(0, 2),
      isStatic: true,
    });

    const manifold: CollisionManifold = {
      bodyA,
      bodyB,
      normal: Vector2.down,
      depth: 0,
      contactPoints: [new Vector2(0, 1)],
    };

    resolveCollision(manifold, 0, true);

    expect(bodyA.velocity.x).toBeCloseTo(0);
    expect(bodyA.velocity.y).toBeCloseTo(-5);
    expect(bodyA.angularVelocity).toBeCloseTo(0);
    expect(bodyA.position.equals(Vector2.zero)).toBe(true);
  });
});
