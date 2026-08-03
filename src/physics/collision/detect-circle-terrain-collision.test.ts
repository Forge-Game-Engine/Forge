import { describe, expect, it } from 'vitest';
import { detectCircleTerrainCollision } from './detect-circle-terrain-collision.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { createVector2, Vector2, vector2Zero } from '../../math/index.js';

function body(
  position: Vector2,
  collider: CircleCollider | TerrainCollider,
  rotation: number = 0,
): CollisionBody {
  return { position, rotation, collider };
}

function flatTerrain(): TerrainCollider {
  return new TerrainCollider(
    [createVector2(-100, 0), createVector2(0, 0), createVector2(100, 0)],
    50,
  );
}

describe('detectCircleTerrainCollision', () => {
  it('should return null when the circle is far above the terrain', () => {
    const circleBody = body(createVector2(0, 100), new CircleCollider(1));
    const terrainBody = body(vector2Zero(), flatTerrain());

    expect(detectCircleTerrainCollision(circleBody, terrainBody)).toBeNull();
  });

  it('should return null when the circle is outside the terrain x-range', () => {
    const circleBody = body(createVector2(500, 0.5), new CircleCollider(1));
    const terrainBody = body(vector2Zero(), flatTerrain());

    expect(detectCircleTerrainCollision(circleBody, terrainBody)).toBeNull();
  });

  it('should detect a collision resting on a flat segment', () => {
    // The terrain's solid slab extends `depth` units in the +y direction
    // from its surface points (in its own local space), so a circle resting
    // "above" the surface (in world space, with no rotation applied) sits
    // at a smaller y than the surface points themselves.
    const circleBody = body(createVector2(0, -0.5), new CircleCollider(1));
    const terrainBody = body(vector2Zero(), flatTerrain());

    const manifold = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(0);
    expect(manifold?.normal.y).toBeCloseTo(1);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints).toHaveLength(1);
    expect(manifold?.featureIds).toEqual([0]);
  });

  it('should pick the deepest contact across overlapping segments', () => {
    const terrain = new TerrainCollider(
      [createVector2(-100, -20), createVector2(0, 0), createVector2(100, -20)],
      500,
    );
    const circleBody = body(createVector2(0, -0.5), new CircleCollider(1));
    const terrainBody = body(vector2Zero(), terrain);

    const manifold = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.depth).toBeCloseTo(0.5097, 3);
    expect(manifold?.featureIds).toEqual([1]);
  });

  it('should account for the terrain body rotation', () => {
    // Rotating the flat terrain by PI flips its solid slab to extend in
    // -y instead of +y, so a circle resting just above it (in world space)
    // still collides, with the normal flipped to match.
    const circleBody = body(createVector2(0, 0.5), new CircleCollider(1));
    const terrainBody = body(vector2Zero(), flatTerrain(), Math.PI);

    const manifold = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.y).toBeCloseTo(-1);
    expect(manifold?.depth).toBeCloseTo(0.5);
  });
});
