import { describe, expect, it } from 'vitest';
import { detectCirclePolygonCollision } from './detect-circle-polygon-collision.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { createVector2, Vector2 } from '../../math/index.js';

function rectangle(width: number, height: number): PolygonCollider {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return new PolygonCollider([
    createVector2(-halfWidth, -halfHeight),
    createVector2(halfWidth, -halfHeight),
    createVector2(halfWidth, halfHeight),
    createVector2(-halfWidth, halfHeight),
  ]);
}

function body(
  position: Vector2,
  collider: CircleCollider | PolygonCollider,
  rotation: number = 0,
): CollisionBody {
  return { position, rotation, collider };
}

describe('detectCirclePolygonCollision', () => {
  it('should return null when the circle is far from the polygon', () => {
    const circleBody = body(createVector2(10, 10), new CircleCollider(1));
    const polygonBody = body(createVector2(0, 0), rectangle(2, 2));

    expect(detectCirclePolygonCollision(circleBody, polygonBody)).toBeNull();
  });

  it('should detect a face-region collision', () => {
    const circleBody = body(createVector2(0, -1.5), new CircleCollider(1));
    const polygonBody = body(createVector2(0, 0), rectangle(2, 2));

    const manifold = detectCirclePolygonCollision(circleBody, polygonBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(0);
    expect(manifold?.normal.y).toBeCloseTo(1);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints).toHaveLength(1);
    expect(manifold?.contactPoints[0].x).toBeCloseTo(0);
    expect(manifold?.contactPoints[0].y).toBeCloseTo(-1);
    expect(manifold?.featureIds).toEqual([0]);
  });

  it('should detect a vertex-region collision', () => {
    const circleBody = body(createVector2(-2, -2), new CircleCollider(1.5));
    const polygonBody = body(createVector2(0, 0), rectangle(2, 2));

    const manifold = detectCirclePolygonCollision(circleBody, polygonBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(Math.SQRT1_2);
    expect(manifold?.normal.y).toBeCloseTo(Math.SQRT1_2);
    expect(manifold?.depth).toBeCloseTo(1.5 - Math.sqrt(2));
    expect(manifold?.contactPoints[0].x).toBeCloseTo(-1);
    expect(manifold?.contactPoints[0].y).toBeCloseTo(-1);
  });

  it('should detect a deep penetration where the circle center is inside the polygon', () => {
    const circleBody = body(createVector2(0, 0), new CircleCollider(0.5));
    const polygonBody = body(createVector2(0, 0), rectangle(2, 2));

    const manifold = detectCirclePolygonCollision(circleBody, polygonBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.depth).toBeCloseTo(1.5);
  });

  it('should account for the polygon body rotation', () => {
    const circleBody = body(createVector2(1.5, 0), new CircleCollider(1));
    const polygonBody = body(createVector2(0, 0), rectangle(2, 2), Math.PI / 2);

    const manifold = detectCirclePolygonCollision(circleBody, polygonBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(-1);
    expect(manifold?.normal.y).toBeCloseTo(0);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints[0].x).toBeCloseTo(1);
    expect(manifold?.contactPoints[0].y).toBeCloseTo(0);
  });
});
