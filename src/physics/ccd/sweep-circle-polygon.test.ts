import { describe, expect, it } from 'vitest';
import { CircleCollider } from '../colliders/circle-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { sweepCirclePolygon } from './sweep-circle-polygon.js';

function square(): PolygonCollider {
  return new PolygonCollider([
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
  ]);
}

function movingCircleBody(radius: number): CollisionBody {
  return {
    position: { x: 0, y: 0 },
    rotation: 0,
    collider: new CircleCollider(radius),
  };
}

function staticPolygonBody(collider: PolygonCollider): CollisionBody {
  return { position: { x: 0, y: 0 }, rotation: 0, collider };
}

describe('sweepCirclePolygon', () => {
  it('returns null when the swept circle never reaches the polygon', () => {
    const hit = sweepCirclePolygon(
      movingCircleBody(1),
      staticPolygonBody(square()),
      { x: -10, y: 5 },
      { x: 0, y: 5 },
    );

    expect(hit).toBeNull();
  });

  it('finds the earliest time of impact against a face', () => {
    const hit = sweepCirclePolygon(
      movingCircleBody(1),
      staticPolygonBody(square()),
      { x: -10, y: 0 },
      { x: 0, y: 0 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(-1);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(-1);
    expect(hit?.normal.y).toBeCloseTo(0);
    // The circle (radius 1) first touches the face (at x=-1) once its
    // center reaches x=-2, 8 units into the 10-unit swept translation.
    expect(hit?.t).toBeCloseTo(0.8);
  });

  it('returns a t of 0 when the circle already overlaps the polygon at the start position', () => {
    const hit = sweepCirclePolygon(
      movingCircleBody(1),
      staticPolygonBody(square()),
      { x: 0, y: 0 },
      { x: 5, y: 0 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.t).toBe(0);
  });

  it('finds the exact time of impact when the sweep just reaches the surface', () => {
    const hit = sweepCirclePolygon(
      movingCircleBody(1),
      staticPolygonBody(square()),
      { x: -10, y: 0 },
      { x: -2, y: 0 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(-1);
    expect(hit?.t).toBeCloseTo(1);
  });

  it('returns null when the sweep stops just short of the surface', () => {
    const hit = sweepCirclePolygon(
      movingCircleBody(1),
      staticPolygonBody(square()),
      { x: -10, y: 0 },
      { x: -2.5, y: 0 },
    );

    expect(hit).toBeNull();
  });

  it('rounds a corner correctly when the sweep grazes a vertex rather than a face', () => {
    // Approaching along the diagonal y = x keeps the perpendicular foot on
    // both faces adjacent to the (1, 1) vertex outside their finite
    // segment range (see sweep-circle-polygon.ts's inflated-edge doc), so
    // only the vertex's own rounded-corner test can find this hit.
    const radius = 0.5;

    const hit = sweepCirclePolygon(
      movingCircleBody(radius),
      staticPolygonBody(square()),
      { x: 4, y: 4 },
      { x: 1, y: 1 },
    );

    expect(hit).not.toBeNull();

    // The actual contact point is the vertex itself, not the moving
    // circle's own center position at the moment of contact.
    expect(hit?.point.x).toBeCloseTo(1);
    expect(hit?.point.y).toBeCloseTo(1);
    expect(hit?.normal.x).toBeCloseTo(Math.SQRT1_2);
    expect(hit?.normal.y).toBeCloseTo(Math.SQRT1_2);

    const traveled = 3 * Math.SQRT2 - radius;
    const totalDistance = 3 * Math.SQRT2;

    expect(hit?.t).toBeCloseTo(traveled / totalDistance);
  });

  it('accounts for the circle collider offset', () => {
    const collider = new CircleCollider(1);
    collider.offset = { x: 0, y: 5 };
    const body: CollisionBody = {
      position: { x: 0, y: 0 },
      rotation: 0,
      collider,
    };

    // The swept entity travels along y=-5, but `offset` puts the circle
    // itself 5 units higher, back onto y=0 where it can reach the square.
    const hit = sweepCirclePolygon(
      body,
      staticPolygonBody(square()),
      { x: -10, y: -5 },
      { x: 0, y: -5 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(-1);
    expect(hit?.point.y).toBeCloseTo(0);
  });
});
