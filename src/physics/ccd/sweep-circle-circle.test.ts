import { describe, expect, it } from 'vitest';
import { CircleCollider } from '../colliders/circle-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { sweepCircleCircle } from './sweep-circle-circle.js';

function body(x: number, y: number, radius: number): CollisionBody {
  return {
    position: { x, y },
    rotation: 0,
    collider: new CircleCollider(radius),
  };
}

describe('sweepCircleCircle', () => {
  it('returns null when the swept circle never reaches the static circle', () => {
    const hit = sweepCircleCircle(
      body(0, 0, 1),
      body(0, 20, 1),
      { x: -10, y: 0 },
      { x: 0, y: 0 },
    );

    expect(hit).toBeNull();
  });

  it('finds the earliest time of impact between two circles', () => {
    const hit = sweepCircleCircle(
      body(0, 0, 1),
      body(0, 0, 2),
      { x: -10, y: 0 },
      { x: 0, y: 0 },
    );

    expect(hit).not.toBeNull();
    // A moving radius-1 circle first touches a static radius-2 circle
    // centered at the origin once its own center reaches x=-3 (the summed
    // radius), 7 units into the 10-unit swept translation.
    expect(hit?.point.x).toBeCloseTo(-2);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(-1);
    expect(hit?.normal.y).toBeCloseTo(0);
    expect(hit?.t).toBeCloseTo(0.7);
  });

  it('returns a t of 0 when the circles already overlap at the start position', () => {
    const hit = sweepCircleCircle(
      body(0, 0, 1),
      body(1, 0, 1),
      { x: 0, y: 0 },
      { x: 5, y: 0 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.t).toBe(0);
  });

  it('finds the exact time of impact when the sweep just reaches the static circle', () => {
    const hit = sweepCircleCircle(
      body(0, 0, 1),
      body(0, 0, 2),
      { x: -10, y: 0 },
      { x: -3, y: 0 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.t).toBeCloseTo(1);
  });

  it('returns null for a zero-length sweep that does not already overlap', () => {
    const hit = sweepCircleCircle(
      body(0, 0, 1),
      body(0, 20, 1),
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    );

    expect(hit).toBeNull();
  });

  it('falls back to an arbitrary normal when the circles start exactly concentric', () => {
    const hit = sweepCircleCircle(
      body(0, 0, 1),
      body(0, 0, 2),
      { x: 0, y: 0 },
      { x: 5, y: 0 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.t).toBe(0);
    expect(hit?.normal.x).toBe(1);
    expect(hit?.normal.y).toBe(0);
    expect(hit?.point.x).toBeCloseTo(2);
    expect(hit?.point.y).toBeCloseTo(0);
  });

  it('accounts for both colliders offsets', () => {
    const movingCollider = new CircleCollider(1);
    movingCollider.offset = { x: 0, y: 5 };
    const movingBody: CollisionBody = {
      position: { x: 0, y: 0 },
      rotation: 0,
      collider: movingCollider,
    };

    const staticCollider = new CircleCollider(2);
    staticCollider.offset = { x: 0, y: 5 };
    const staticBody: CollisionBody = {
      position: { x: 0, y: 0 },
      rotation: 0,
      collider: staticCollider,
    };

    const hit = sweepCircleCircle(
      movingBody,
      staticBody,
      { x: -10, y: 0 },
      { x: 0, y: 0 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.y).toBeCloseTo(5);
  });
});
