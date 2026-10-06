import { describe, expect, it } from 'vitest';
import { CircleCollider } from '../colliders/circle-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { sweepCircleCircle } from './sweep-circle-circle.js';

describe('sweepCircleCircle', () => {
  const circle = new CircleCollider(10);
  const target: CollisionBody = {
    position: { x: 0, y: 0 },
    rotation: 0,
    collider: new CircleCollider(20),
  };

  it('should find where the circles first touch', () => {
    const hit = sweepCircleCircle(
      circle,
      target,
      { x: -100, y: 0 },
      { x: 0, y: 0 },
    );

    expect(hit?.t).toBeCloseTo(0.7);
    expect(hit?.normal.x).toBeCloseTo(-1);
    expect(hit?.normal.y).toBeCloseTo(0);
    expect(hit?.point.x).toBeCloseTo(-20);
    expect(hit?.point.y).toBeCloseTo(0);
  });

  it('should find the near side of a circle the sweep would pass straight through', () => {
    const hit = sweepCircleCircle(
      circle,
      target,
      { x: -100, y: 0 },
      { x: 100, y: 0 },
    );

    expect(hit?.t).toBeCloseTo(0.35);
  });

  it('should return null for a sweep that misses', () => {
    expect(
      sweepCircleCircle(circle, target, { x: -100, y: 31 }, { x: 100, y: 31 }),
    ).toBeNull();
  });

  it('should return null for a sweep that starts already overlapping', () => {
    expect(
      sweepCircleCircle(circle, target, { x: -25, y: 0 }, { x: 0, y: 0 }),
    ).toBeNull();
  });

  it('should return null for a sweep that stops short', () => {
    expect(
      sweepCircleCircle(circle, target, { x: -100, y: 0 }, { x: -31, y: 0 }),
    ).toBeNull();
  });

  it("should account for both circles' offsets", () => {
    const offsetTarget = new CircleCollider(20);

    offsetTarget.offset = { x: 0, y: 50 };

    const hit = sweepCircleCircle(
      circle,
      { position: { x: 0, y: -50 }, rotation: 0, collider: offsetTarget },
      { x: -100, y: 0 },
      { x: 0, y: 0 },
    );

    expect(hit?.t).toBeCloseTo(0.7);
  });
});
