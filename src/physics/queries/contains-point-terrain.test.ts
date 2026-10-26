import { describe, expect, it } from 'vitest';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { containsPointTerrain } from './contains-point-terrain.js';

// A hill: the surface rises from y = 10 at x = 0 to y = 0 at x = 10 and
// falls back to y = 10 at x = 20. The slab's bottom is at y = 15.
const hill = new TerrainCollider(
  [
    { x: 0, y: 10 },
    { x: 10, y: 0 },
    { x: 20, y: 10 },
  ],
  5,
);

describe('containsPointTerrain', () => {
  const body = { position: { x: 0, y: 0 }, rotation: 0, collider: hill };

  it('does not contain a point above the surface', () => {
    expect(containsPointTerrain(body, { x: 5, y: 4 })).toBe(false);
  });

  it('contains a point on the surface of a slope', () => {
    expect(containsPointTerrain(body, { x: 5, y: 5 })).toBe(true);
    expect(containsPointTerrain(body, { x: 15, y: 5 })).toBe(true);
  });

  it('contains a point below the surface', () => {
    expect(containsPointTerrain(body, { x: 5, y: 6 })).toBe(true);
    expect(containsPointTerrain(body, { x: 15, y: 14 })).toBe(true);
  });

  it('contains a point exactly on a surface vertex', () => {
    expect(containsPointTerrain(body, { x: 10, y: 0 })).toBe(true);
    expect(containsPointTerrain(body, { x: 10, y: -0.1 })).toBe(false);
  });

  it('contains a point on the bottom, but not below it', () => {
    expect(containsPointTerrain(body, { x: 5, y: 15 })).toBe(true);
    expect(containsPointTerrain(body, { x: 5, y: 15.1 })).toBe(false);
  });

  it('contains the slab at its first and last points, but not beyond them', () => {
    expect(containsPointTerrain(body, { x: 0, y: 12 })).toBe(true);
    expect(containsPointTerrain(body, { x: 20, y: 12 })).toBe(true);
    expect(containsPointTerrain(body, { x: -0.1, y: 12 })).toBe(false);
    expect(containsPointTerrain(body, { x: 20.1, y: 12 })).toBe(false);
  });

  it('finds the surface edge under a point among many', () => {
    const steps = new TerrainCollider(
      Array.from({ length: 50 }, (_, i) => ({ x: i, y: i % 2 === 0 ? 0 : 4 })),
      2,
    );
    const stepsBody = {
      position: { x: 0, y: 0 },
      rotation: 0,
      collider: steps,
    };

    // Between x = 37 (y = 4) and x = 38 (y = 0), the surface at 37.25 is
    // at y = 3.
    expect(containsPointTerrain(stepsBody, { x: 37.25, y: 3 })).toBe(true);
    expect(containsPointTerrain(stepsBody, { x: 37.25, y: 2.9 })).toBe(false);
    expect(containsPointTerrain(stepsBody, { x: 49, y: 4 })).toBe(true);
  });

  it('moves and turns the terrain with its entity', () => {
    const moved = {
      position: { x: 100, y: 50 },
      rotation: Math.PI,
      collider: hill,
    };

    // Turned by half a turn, the hill hangs from the ceiling: local (5, 6)
    // is world (95, 44).
    expect(containsPointTerrain(moved, { x: 95, y: 44 })).toBe(true);
    expect(containsPointTerrain(moved, { x: 95, y: 46 })).toBe(false);
    expect(containsPointTerrain(moved, { x: 5, y: 6 })).toBe(false);
  });
});
