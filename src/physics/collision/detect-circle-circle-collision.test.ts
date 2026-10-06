import { describe, expect, it } from 'vitest';
import { detectCircleCircleCollision } from './detect-circle-circle-collision.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { Vec2, Vector2 } from '../../math/index.js';

function circleBody(position: Vector2, radius: number): CollisionBody {
  return { position, rotation: 0, collider: new CircleCollider(radius) };
}

describe('detectCircleCircleCollision', () => {
  it("should collide at each circle's center rotated with its entity", () => {
    // B's local center (0, 5), turned a quarter turn, sits 5 units left of
    // its origin: at (1.5, 0), overlapping A by 0.5.
    const bodyA = circleBody({ x: 0, y: 0 }, 1);
    const bodyB: CollisionBody = {
      position: { x: 6.5, y: 0 },
      rotation: Math.PI / 2,
      collider: new CircleCollider(1, 1, { x: 0, y: 5 }),
    };

    const manifold = detectCircleCircleCollision(bodyA, bodyB);

    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.normal.x).toBeCloseTo(1);
    expect(manifold?.contactPoints[0].x).toBeCloseTo(1);
  });

  it('should return null when the circles do not overlap', () => {
    const bodyA = circleBody({ x: 0, y: 0 }, 1);
    const bodyB = circleBody({ x: 3, y: 0 }, 1);

    expect(detectCircleCircleCollision(bodyA, bodyB)).toBeNull();
  });

  it('should return a manifold with zero depth when the circles are exactly touching', () => {
    const bodyA = circleBody({ x: 0, y: 0 }, 1);
    const bodyB = circleBody({ x: 2, y: 0 }, 1);

    const manifold = detectCircleCircleCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.depth).toBeCloseTo(0);
  });

  it('should return a manifold pointing from bodyA toward bodyB when overlapping', () => {
    const bodyA = circleBody({ x: 0, y: 0 }, 1);
    const bodyB = circleBody({ x: 1.5, y: 0 }, 1);

    const manifold = detectCircleCircleCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(1);
    expect(manifold?.normal.y).toBeCloseTo(0);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints).toHaveLength(1);
    expect(manifold?.contactPoints[0].x).toBeCloseTo(1);
    expect(manifold?.contactPoints[0].y).toBeCloseTo(0);
    expect(manifold?.featureIds).toEqual([0]);
  });

  it('should fall back to a default normal when the circles are concentric', () => {
    const bodyA = circleBody({ x: 2, y: 2 }, 1);
    const bodyB = circleBody({ x: 2, y: 2 }, 1);

    const manifold = detectCircleCircleCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(Vec2.equals(manifold!.normal, { x: 0, y: 1 })).toBe(true);
    expect(manifold?.depth).toBeCloseTo(2);
    expect(manifold?.contactPoints[0].x).toBeCloseTo(2);
    expect(manifold?.contactPoints[0].y).toBeCloseTo(3);
  });
});
