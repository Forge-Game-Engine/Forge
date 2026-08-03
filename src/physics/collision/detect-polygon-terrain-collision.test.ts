import { describe, expect, it } from 'vitest';
import { detectPolygonTerrainCollision } from './detect-polygon-terrain-collision.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { Vector2 } from '../../math/index.js';

function rectangle(width: number, height: number): PolygonCollider {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return new PolygonCollider([
    new Vector2(-halfWidth, -halfHeight),
    new Vector2(halfWidth, -halfHeight),
    new Vector2(halfWidth, halfHeight),
    new Vector2(-halfWidth, halfHeight),
  ]);
}

function body(
  position: Vector2,
  collider: PolygonCollider | TerrainCollider,
  rotation: number = 0,
): CollisionBody {
  return { position, rotation, collider };
}

function flatTerrain(): TerrainCollider {
  return new TerrainCollider(
    [new Vector2(-100, 0), new Vector2(0, 0), new Vector2(100, 0)],
    50,
  );
}

describe('detectPolygonTerrainCollision', () => {
  it('should return null when the polygon is above the terrain with a gap', () => {
    const polygonBody = body(new Vector2(0, -1.5), rectangle(2, 2));
    const terrainBody = body(Vector2.zero, flatTerrain());

    expect(detectPolygonTerrainCollision(polygonBody, terrainBody)).toBeNull();
  });

  it('should return null when the polygon is outside the terrain x-range', () => {
    const polygonBody = body(new Vector2(500, -0.5), rectangle(2, 2));
    const terrainBody = body(Vector2.zero, flatTerrain());

    expect(detectPolygonTerrainCollision(polygonBody, terrainBody)).toBeNull();
  });

  it('should detect a collision resting on a flat segment', () => {
    // Mirrors detectCircleTerrainCollision's tests: the terrain's solid
    // slab extends in +y locally, so a polygon resting "above" the surface
    // in world space (unrotated) sits at a smaller y than the surface.
    const polygonBody = body(new Vector2(0, -0.5), rectangle(2, 2));
    const terrainBody = body(Vector2.zero, flatTerrain());

    const manifold = detectPolygonTerrainCollision(polygonBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(0);
    expect(manifold?.normal.y).toBeCloseTo(1);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints).toHaveLength(2);
  });

  it('should offset feature ids by the matched segment so warm-starting stays segment-scoped', () => {
    const polygonBody = body(new Vector2(0, -0.5), rectangle(2, 2));
    const terrainBody = body(Vector2.zero, flatTerrain());

    const manifold = detectPolygonTerrainCollision(polygonBody, terrainBody);

    expect(manifold?.featureIds.every((id) => id >= 0)).toBe(true);
    expect(new Set(manifold?.featureIds).size).toBe(
      manifold?.featureIds.length,
    );
  });
});
