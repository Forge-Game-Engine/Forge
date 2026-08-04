import { describe, expect, it } from 'vitest';
import { aabbsOverlap } from './aabb-overlap.js';
import { Vec2 } from '../../math/index.js';

describe('aabbsOverlap', () => {
  it('should return true when AABBs overlap', () => {
    const a = { min: Vec2.create(0, 0), max: Vec2.create(2, 2) };
    const b = { min: Vec2.create(1, 1), max: Vec2.create(3, 3) };

    expect(aabbsOverlap(a, b)).toBe(true);
  });

  it('should return false when AABBs are separated', () => {
    const a = { min: Vec2.create(0, 0), max: Vec2.create(1, 1) };
    const b = { min: Vec2.create(2, 2), max: Vec2.create(3, 3) };

    expect(aabbsOverlap(a, b)).toBe(false);
  });

  it('should return true when AABBs only touch edges', () => {
    const a = { min: Vec2.create(0, 0), max: Vec2.create(1, 1) };
    const b = { min: Vec2.create(1, 0), max: Vec2.create(2, 1) };

    expect(aabbsOverlap(a, b)).toBe(true);
  });
});
