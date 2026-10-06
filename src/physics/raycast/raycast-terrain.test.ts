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
      { x: 500, y: 10 },
      { x: 500, y: -10 },
    );

    expect(hit).toBeNull();
  });

  it('should hit the surface from above', () => {
    const terrainBody = body(Vec2.zero, flatTerrain());

    const hit = raycastTerrain(terrainBody, { x: 1, y: 10 }, { x: 1, y: -10 });

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(1);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(0);
    expect(hit?.normal.y).toBeCloseTo(1);
    expect(hit?.distance).toBeCloseTo(10);
  });

  it('should hit the bottom of the slab from below', () => {
    // flatTerrain()'s slab runs from its surface at y = 0 down to
    // y = -50, so a ray rising from beneath it enters through the bottom
    // edge, facing down.
    const terrainBody = body(Vec2.zero, flatTerrain());

    const hit = raycastTerrain(terrainBody, { x: 1, y: -60 }, { x: 1, y: 10 });

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(1);
    expect(hit?.point.y).toBeCloseTo(-50);
    expect(hit?.normal.x).toBeCloseTo(0);
    expect(hit?.normal.y).toBeCloseTo(-1);
    expect(hit?.distance).toBeCloseTo(10);
  });

  it('should hit the side of the slab from beside it', () => {
    // The chain ends at x = 100, so a ray traveling left just below the
    // surface enters the slab through its right-hand side.
    const terrainBody = body(Vec2.zero, flatTerrain());

    const hit = raycastTerrain(
      terrainBody,
      { x: 110, y: -25 },
      { x: 90, y: -25 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(100);
    expect(hit?.point.y).toBeCloseTo(-25);
    expect(hit?.normal.x).toBeCloseTo(1);
    expect(hit?.normal.y).toBeCloseTo(0);
    expect(hit?.distance).toBeCloseTo(10);
  });

  it('should pick the nearest crossed segment on uneven terrain', () => {
    const terrain = new TerrainCollider(
      [
        { x: -100, y: 20 },
        { x: 0, y: 0 },
        { x: 100, y: 20 },
      ],
      500,
    );
    const terrainBody = body(Vec2.zero, terrain);

    const hit = raycastTerrain(
      terrainBody,
      { x: 50, y: 30 },
      { x: 50, y: -30 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.y).toBeCloseTo(10);
  });

  it('should account for the terrain body rotation', () => {
    // Rotating the flat terrain a quarter turn counter-clockwise stands it
    // up as a wall along x = 0: its surface runs from (0, -100) to
    // (0, 100), and its local "down" (-y), where the slab is, becomes world
    // +x. A ray traveling right therefore hits the surface head on, with
    // the normal facing back toward it.
    const terrainBody = body(Vec2.zero, flatTerrain(), Math.PI / 2);

    const hit = raycastTerrain(
      terrainBody,
      { x: -10, y: -50 },
      { x: 10, y: -50 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(0);
    expect(hit?.point.y).toBeCloseTo(-50);
    expect(hit?.normal.x).toBeCloseTo(-1);
    expect(hit?.normal.y).toBeCloseTo(0);
    expect(hit?.distance).toBeCloseTo(10);
  });
});
