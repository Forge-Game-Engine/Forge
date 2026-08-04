import { describe, expect, it } from 'vitest';
import { raycastTerrain } from './raycast-terrain.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { Vec2, Vector2 } from '../../math/index.js';

function body(
  position: Vector2,
  collider: TerrainCollider,
  rotation: number = 0,
): CollisionBody {
  return { position, rotation, collider };
}

function flatTerrain(): TerrainCollider {
  return new TerrainCollider(
    [
      { x: -100, y: 0 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    50,
  );
}

describe('raycastTerrain', () => {
  it('should return null when the ray is outside the terrain x-range', () => {
    const terrainBody = body(Vec2.zero, flatTerrain());

    const hit = raycastTerrain(
      terrainBody,
      { x: 500, y: -10 },
      { x: 500, y: 10 },
    );

    expect(hit).toBeNull();
  });

  it('should hit the surface from above', () => {
    const terrainBody = body(Vec2.zero, flatTerrain());

    const hit = raycastTerrain(terrainBody, { x: 1, y: -10 }, { x: 1, y: 10 });

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(1);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(0);
    expect(hit?.normal.y).toBeCloseTo(-1);
    expect(hit?.distance).toBeCloseTo(10);
  });

  it('should pick the nearest crossed segment on uneven terrain', () => {
    const terrain = new TerrainCollider(
      [
        { x: -100, y: -20 },
        { x: 0, y: 0 },
        { x: 100, y: -20 },
      ],
      500,
    );
    const terrainBody = body(Vec2.zero, terrain);

    const hit = raycastTerrain(
      terrainBody,
      { x: 50, y: -30 },
      { x: 50, y: 30 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.y).toBeCloseTo(-10);
  });

  it('should account for the terrain body rotation', () => {
    // Rotating the flat terrain by PI flips its solid slab to extend in -y
    // instead of +y, so a ray traveling upward (from a larger y to a
    // smaller y) now hits the surface from underneath, with the normal
    // flipped to match.
    const terrainBody = body(Vec2.zero, flatTerrain(), Math.PI);

    const hit = raycastTerrain(terrainBody, { x: 1, y: 10 }, { x: 1, y: -10 });

    expect(hit).not.toBeNull();
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.y).toBeCloseTo(1);
  });
});
