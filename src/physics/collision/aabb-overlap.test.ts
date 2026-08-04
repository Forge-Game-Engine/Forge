import { describe, expect, it } from 'vitest';
import { aabbsOverlap } from './aabb-overlap.js';

describe('aabbsOverlap', () => {
  it('should return true when AABBs overlap', () => {
    const a = { min: { x: 0, y: 0 }, max: { x: 2, y: 2 } };
    const b = { min: { x: 1, y: 1 }, max: { x: 3, y: 3 } };

    expect(aabbsOverlap(a, b)).toBe(true);
  });

  it('should return false when AABBs are separated', () => {
    const a = { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } };
    const b = { min: { x: 2, y: 2 }, max: { x: 3, y: 3 } };

    expect(aabbsOverlap(a, b)).toBe(false);
  });

  it('should return true when AABBs only touch edges', () => {
    const a = { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } };
    const b = { min: { x: 1, y: 0 }, max: { x: 2, y: 1 } };

    expect(aabbsOverlap(a, b)).toBe(true);
  });
});
