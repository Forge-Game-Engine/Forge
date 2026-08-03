import { describe, expect, it } from 'vitest';
import { aabbsOverlap } from './aabb-overlap.js';
import { Vector2 } from '../../math/index.js';

describe('aabbsOverlap', () => {
  it('should return true when AABBs overlap', () => {
    const a = { min: new Vector2(0, 0), max: new Vector2(2, 2) };
    const b = { min: new Vector2(1, 1), max: new Vector2(3, 3) };

    expect(aabbsOverlap(a, b)).toBe(true);
  });

  it('should return false when AABBs are separated', () => {
    const a = { min: new Vector2(0, 0), max: new Vector2(1, 1) };
    const b = { min: new Vector2(2, 2), max: new Vector2(3, 3) };

    expect(aabbsOverlap(a, b)).toBe(false);
  });

  it('should return true when AABBs only touch edges', () => {
    const a = { min: new Vector2(0, 0), max: new Vector2(1, 1) };
    const b = { min: new Vector2(1, 0), max: new Vector2(2, 1) };

    expect(aabbsOverlap(a, b)).toBe(true);
  });
});
