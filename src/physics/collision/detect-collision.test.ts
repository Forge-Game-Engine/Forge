import { describe, expect, it } from 'vitest';
import { detectCollision } from './detect-collision.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape, PolygonShape } from '../shapes/index.js';
import { Vector2 } from '../../math/index.js';

describe('detectCollision', () => {
  it('should dispatch circle-circle collisions', () => {
    const bodyA = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, 0),
    });
    const bodyB = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(1.5, 0),
    });

    const manifold = detectCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.bodyA).toBe(bodyA);
    expect(manifold?.bodyB).toBe(bodyB);
  });

  it('should dispatch circle-polygon collisions', () => {
    const bodyA = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, -1.5),
    });
    const bodyB = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, 0),
    });

    const manifold = detectCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.bodyA).toBe(bodyA);
    expect(manifold?.bodyB).toBe(bodyB);
    expect(manifold?.normal.x).toBeCloseTo(0);
    expect(manifold?.normal.y).toBeCloseTo(1);
  });

  it('should dispatch polygon-circle collisions, preserving body order', () => {
    const bodyA = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, 0),
    });
    const bodyB = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, -1.5),
    });

    const manifold = detectCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.bodyA).toBe(bodyA);
    expect(manifold?.bodyB).toBe(bodyB);
    expect(manifold?.normal.x).toBeCloseTo(0);
    expect(manifold?.normal.y).toBeCloseTo(-1);
    expect(manifold?.depth).toBeCloseTo(0.5);
  });

  it('should dispatch polygon-polygon collisions', () => {
    const bodyA = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, 0),
    });
    const bodyB = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(1.5, 0),
    });

    const manifold = detectCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.bodyA).toBe(bodyA);
    expect(manifold?.bodyB).toBe(bodyB);
    expect(manifold?.normal.x).toBeCloseTo(1);
    expect(manifold?.normal.y).toBeCloseTo(0);
  });

  it('should throw an error for an unregistered shape pair', () => {
    const bodyA = new RigidBody({ shape: new CircleShape(1) });
    const fakeBody = {
      shape: { type: 'unknown' },
    } as unknown as RigidBody;

    expect(() => detectCollision(bodyA, fakeBody)).toThrow();
  });
});
