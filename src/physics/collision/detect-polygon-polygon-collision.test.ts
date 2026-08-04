import { describe, expect, it } from 'vitest';
import { detectPolygonPolygonCollision } from './detect-polygon-polygon-collision.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { Vec2, Vector2 } from '../../math/index.js';

function rectangle(width: number, height: number): PolygonCollider {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return new PolygonCollider([
    Vec2.create(-halfWidth, -halfHeight),
    Vec2.create(halfWidth, -halfHeight),
    Vec2.create(halfWidth, halfHeight),
    Vec2.create(-halfWidth, halfHeight),
  ]);
}

function body(
  position: Vector2,
  collider: PolygonCollider,
  rotation: number = 0,
): CollisionBody {
  return { position, rotation, collider };
}

describe('detectPolygonPolygonCollision', () => {
  it('should return null when the polygons do not overlap', () => {
    const bodyA = body(Vec2.create(0, 0), rectangle(2, 2));
    const bodyB = body(Vec2.create(5, 0), rectangle(2, 2));

    expect(detectPolygonPolygonCollision(bodyA, bodyB)).toBeNull();
  });

  it('should detect an overlap between two axis-aligned boxes', () => {
    const bodyA = body(Vec2.create(0, 0), rectangle(2, 2));
    const bodyB = body(Vec2.create(1.5, 0), rectangle(2, 2));

    const manifold = detectPolygonPolygonCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(1);
    expect(manifold?.normal.y).toBeCloseTo(0);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints).toHaveLength(2);

    for (const contactPoint of manifold?.contactPoints ?? []) {
      expect(contactPoint.x).toBeCloseTo(0.5);
    }

    expect(manifold?.featureIds).toHaveLength(2);
    expect(manifold?.featureIds[0]).not.toBe(manifold?.featureIds[1]);
  });

  it('should produce the same feature ids across ticks for an unchanged contact', () => {
    const bodyA = body(Vec2.create(0, 0), rectangle(2, 2));
    const bodyB = body(Vec2.create(1.5, 0), rectangle(2, 2));

    const first = detectPolygonPolygonCollision(bodyA, bodyB);
    const second = detectPolygonPolygonCollision(bodyA, bodyB);

    expect(first?.featureIds).toEqual(second?.featureIds);
  });

  it('should account for body rotation', () => {
    const angle = Math.PI / 4;
    const bodyA = body(Vec2.create(0, 0), rectangle(2, 2), angle);
    const bodyB = body(
      Vec2.rotate(Vec2.create(1.5, 0), angle),
      rectangle(2, 2),
      angle,
    );

    const manifold = detectPolygonPolygonCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(Math.SQRT1_2);
    expect(manifold?.normal.y).toBeCloseTo(Math.SQRT1_2);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints).toHaveLength(2);
  });

  it('should return a single contact point for a corner-only overlap', () => {
    const bodyA = body(Vec2.create(0, 0), rectangle(2, 2));
    const bodyB = body(
      Vec2.create(0, 1 + Math.sqrt(2) - 0.2),
      rectangle(2, 2),
      Math.PI / 4,
    );

    const manifold = detectPolygonPolygonCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(0);
    expect(manifold?.normal.y).toBeCloseTo(1);
    expect(manifold?.depth).toBeCloseTo(0.2);
    expect(manifold?.contactPoints).toHaveLength(1);
    expect(manifold?.contactPoints[0].x).toBeCloseTo(0);
    expect(manifold?.contactPoints[0].y).toBeCloseTo(0.8);
  });

  it('should detect an overlap between an arbitrary convex polygon and a box', () => {
    const bodyA = body(Vec2.create(0, 0), rectangle(4, 4));
    const bodyB = body(
      Vec2.create(2, 0),
      new PolygonCollider([
        Vec2.create(0, 0),
        Vec2.create(2, 0),
        Vec2.create(0, 2),
      ]),
    );

    const manifold = detectPolygonPolygonCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeGreaterThan(0);
    expect(manifold?.depth).toBeGreaterThan(0);
    expect(manifold?.contactPoints.length).toBeGreaterThanOrEqual(1);
    expect(manifold?.contactPoints.length).toBeLessThanOrEqual(2);
  });
});
