import { describe, expect, it } from 'vitest';
import { CircleCollider } from '../colliders/circle-collider.js';
import { containsPointCircle } from './contains-point-circle.js';

describe('containsPointCircle', () => {
  const body = {
    position: { x: 10, y: 20 },
    rotation: 0,
    collider: new CircleCollider(2),
  };

  it('contains a point inside the circle', () => {
    expect(containsPointCircle(body, { x: 11, y: 21 })).toBe(true);
  });

  it('contains a point on the circle', () => {
    expect(containsPointCircle(body, { x: 12, y: 20 })).toBe(true);
  });

  it('does not contain a point outside the circle', () => {
    expect(containsPointCircle(body, { x: 11.5, y: 21.5 })).toBe(false);
  });

  it('turns an offset center with the entity', () => {
    const offsetBody = {
      position: { x: 10, y: 20 },
      rotation: Math.PI / 2,
      collider: new CircleCollider(1, 1, { x: 5, y: 0 }),
    };

    // +X turned a quarter towards +Y points down the screen.
    expect(containsPointCircle(offsetBody, { x: 10, y: 25 })).toBe(true);
    expect(containsPointCircle(offsetBody, { x: 15, y: 20 })).toBe(false);
    expect(containsPointCircle(offsetBody, { x: 10, y: 20 })).toBe(false);
  });
});
