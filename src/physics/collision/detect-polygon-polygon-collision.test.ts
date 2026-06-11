import { describe, expect, it } from 'vitest';
import { detectPolygonPolygonCollision } from './detect-polygon-polygon-collision.js';
import { RigidBody } from '../rigid-body.js';
import { PolygonShape } from '../shapes/index.js';
import { Vector2 } from '../../math/index.js';

describe('detectPolygonPolygonCollision', () => {
  it('should return null when the polygons do not overlap', () => {
    const bodyA = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, 0),
    });
    const bodyB = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(5, 0),
    });

    expect(detectPolygonPolygonCollision(bodyA, bodyB)).toBeNull();
  });

  it('should detect an overlap between two axis-aligned boxes', () => {
    const bodyA = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, 0),
    });
    const bodyB = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(1.5, 0),
    });

    const manifold = detectPolygonPolygonCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.bodyA).toBe(bodyA);
    expect(manifold?.bodyB).toBe(bodyB);
    expect(manifold?.normal.x).toBeCloseTo(1);
    expect(manifold?.normal.y).toBeCloseTo(0);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints).toHaveLength(2);

    for (const contactPoint of manifold?.contactPoints ?? []) {
      expect(contactPoint.x).toBeCloseTo(0.5);
    }
  });

  it('should account for body rotation', () => {
    const angle = Math.PI / 4;
    const bodyA = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, 0),
      angle,
    });
    const bodyB = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(1.5, 0).rotate(angle),
      angle,
    });

    const manifold = detectPolygonPolygonCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(Math.SQRT1_2);
    expect(manifold?.normal.y).toBeCloseTo(Math.SQRT1_2);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints).toHaveLength(2);
  });

  it('should return a single contact point for a corner-only overlap', () => {
    const bodyA = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, 0),
    });
    const bodyB = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, 1 + Math.sqrt(2) - 0.2),
      angle: Math.PI / 4,
    });

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
    const bodyA = new RigidBody({
      shape: PolygonShape.rectangle(4, 4),
      position: new Vector2(0, 0),
    });
    const bodyB = new RigidBody({
      shape: new PolygonShape([
        new Vector2(0, 0),
        new Vector2(2, 0),
        new Vector2(0, 2),
      ]),
      position: new Vector2(2, 0),
    });

    const manifold = detectPolygonPolygonCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeGreaterThan(0);
    expect(manifold?.depth).toBeGreaterThan(0);
    expect(manifold?.contactPoints.length).toBeGreaterThanOrEqual(1);
    expect(manifold?.contactPoints.length).toBeLessThanOrEqual(2);
  });
});
