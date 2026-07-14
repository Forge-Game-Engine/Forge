import { describe, expect, it } from 'vitest';
import { detectCirclePolygonCollision } from './detect-circle-polygon-collision.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape, PolygonShape } from '../shapes/index.js';
import { Vector2 } from '../../math/index.js';

describe('detectCirclePolygonCollision', () => {
  it('should return null when the circle is far from the polygon', () => {
    const circleBody = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(10, 10),
    });
    const polygonBody = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, 0),
    });

    expect(detectCirclePolygonCollision(circleBody, polygonBody)).toBeNull();
  });

  it('should detect a face-region collision', () => {
    const circleBody = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, -1.5),
    });
    const polygonBody = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, 0),
    });

    const manifold = detectCirclePolygonCollision(circleBody, polygonBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.bodyA).toBe(circleBody);
    expect(manifold?.bodyB).toBe(polygonBody);
    expect(manifold?.normal.x).toBeCloseTo(0);
    expect(manifold?.normal.y).toBeCloseTo(1);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints).toHaveLength(1);
    expect(manifold?.contactPoints[0].x).toBeCloseTo(0);
    expect(manifold?.contactPoints[0].y).toBeCloseTo(-1);
  });

  it('should detect a vertex-region collision', () => {
    const circleBody = new RigidBody({
      shape: new CircleShape(1.5),
      position: new Vector2(-2, -2),
    });
    const polygonBody = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, 0),
    });

    const manifold = detectCirclePolygonCollision(circleBody, polygonBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(Math.SQRT1_2);
    expect(manifold?.normal.y).toBeCloseTo(Math.SQRT1_2);
    expect(manifold?.depth).toBeCloseTo(1.5 - Math.sqrt(2));
    expect(manifold?.contactPoints[0].x).toBeCloseTo(-1);
    expect(manifold?.contactPoints[0].y).toBeCloseTo(-1);
  });

  it('should detect a deep penetration where the circle center is inside the polygon', () => {
    const circleBody = new RigidBody({
      shape: new CircleShape(0.5),
      position: new Vector2(0, 0),
    });
    const polygonBody = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, 0),
    });

    const manifold = detectCirclePolygonCollision(circleBody, polygonBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.depth).toBeCloseTo(1.5);
  });

  it('should account for the polygon body rotation', () => {
    const circleBody = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(1.5, 0),
    });
    const polygonBody = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, 0),
      angle: Math.PI / 2,
    });

    const manifold = detectCirclePolygonCollision(circleBody, polygonBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(-1);
    expect(manifold?.normal.y).toBeCloseTo(0);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints[0].x).toBeCloseTo(1);
    expect(manifold?.contactPoints[0].y).toBeCloseTo(0);
  });
});
