import { describe, expect, it } from 'vitest';
import { detectCircleCircleCollision } from './detect-circle-circle-collision.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';
import { Vector2 } from '../../math/index.js';

describe('detectCircleCircleCollision', () => {
  it('should return null when the circles do not overlap', () => {
    const bodyA = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, 0),
    });
    const bodyB = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(3, 0),
    });

    expect(detectCircleCircleCollision(bodyA, bodyB)).toBeNull();
  });

  it('should return a manifold with zero depth when the circles are exactly touching', () => {
    const bodyA = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, 0),
    });
    const bodyB = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(2, 0),
    });

    const manifold = detectCircleCircleCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.depth).toBeCloseTo(0);
  });

  it('should return a manifold pointing from bodyA toward bodyB when overlapping', () => {
    const bodyA = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, 0),
    });
    const bodyB = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(1.5, 0),
    });

    const manifold = detectCircleCircleCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.bodyA).toBe(bodyA);
    expect(manifold?.bodyB).toBe(bodyB);
    expect(manifold?.normal.x).toBeCloseTo(1);
    expect(manifold?.normal.y).toBeCloseTo(0);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints).toHaveLength(1);
    expect(manifold?.contactPoints[0].x).toBeCloseTo(1);
    expect(manifold?.contactPoints[0].y).toBeCloseTo(0);
  });

  it('should fall back to a default normal when the circles are concentric', () => {
    const bodyA = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(2, 2),
    });
    const bodyB = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(2, 2),
    });

    const manifold = detectCircleCircleCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.equals(Vector2.up)).toBe(true);
    expect(manifold?.depth).toBeCloseTo(2);
  });
});
