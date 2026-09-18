import { describe, expect, it } from 'vitest';
import { detectPolygonTerrainCollision } from './detect-polygon-terrain-collision.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { Vec2, Vector2 } from '../../math/index.js';

function rectangle(width: number, height: number): PolygonCollider {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return new PolygonCollider([
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
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
    [
      { x: -100, y: 0 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    50,
  );
}

describe('detectPolygonTerrainCollision', () => {
  it('should return null when the polygon is above the terrain with a gap', () => {
    const polygonBody = body({ x: 0, y: -1.5 }, rectangle(2, 2));
    const terrainBody = body(Vec2.zero, flatTerrain());

    expect(detectPolygonTerrainCollision(polygonBody, terrainBody)).toBeNull();
  });

  it('should return null when the polygon is outside the terrain x-range', () => {
    const polygonBody = body({ x: 500, y: -0.5 }, rectangle(2, 2));
    const terrainBody = body(Vec2.zero, flatTerrain());

    expect(detectPolygonTerrainCollision(polygonBody, terrainBody)).toBeNull();
  });

  it('should detect a collision resting on a flat segment', () => {
    // Mirrors detectCircleTerrainCollision's tests: the terrain's solid
    // slab extends in +y locally, so a polygon resting "above" the surface
    // in world space (unrotated) sits at a smaller y than the surface.
    const polygonBody = body({ x: 0, y: -0.5 }, rectangle(2, 2));
    const terrainBody = body(Vec2.zero, flatTerrain());

    const manifold = detectPolygonTerrainCollision(polygonBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(0);
    expect(manifold?.normal.y).toBeCloseTo(1);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints).toHaveLength(2);
  });

  it('should offset feature ids by the matched segment so warm-starting stays segment-scoped', () => {
    const polygonBody = body({ x: 0, y: -0.5 }, rectangle(2, 2));
    const terrainBody = body(Vec2.zero, flatTerrain());

    const manifold = detectPolygonTerrainCollision(polygonBody, terrainBody);

    expect(manifold?.featureIds.every((id) => id >= 0)).toBe(true);
    expect(new Set(manifold?.featureIds).size).toBe(
      manifold?.featureIds.length,
    );
  });

  it('should keep picking the same segment across ties that differ only by floating-point noise', () => {
    // A box centered directly above the shared vertex of two mirror-image
    // slopes: both segments compute mathematically identical depths,
    // differing only by a handful of ULPs of floating-point rounding - the
    // exact scenario that used to flip `featureIds` between ticks and break
    // warm-starting. Segments are always compared in the same fixed,
    // ascending-index order (see detectPolygonTerrainCollision's loop), so
    // segment 0 is always evaluated - and kept - first, and
    // `DEPTH_TIE_TOLERANCE` keeps it pinned against segment 1's
    // near-identical depth.
    const terrain = new TerrainCollider(
      [
        { x: -100, y: -20 },
        { x: 0, y: 0 },
        { x: 100, y: -20 },
      ],
      500,
    );
    const polygonBody = body({ x: 0, y: -0.5 }, rectangle(2, 2));
    const terrainBody = body(Vec2.zero, terrain);

    const manifold = detectPolygonTerrainCollision(polygonBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.depth).toBeCloseTo(0.6864, 3);
    expect(manifold?.contactPoints[0].x).toBeLessThan(0);
    expect(manifold?.contactPoints[1].x).toBeLessThan(0);
  });

  it('should never flip feature ids for a wide body resting across many near-coplanar segments', () => {
    // A wide box resting across several segments (the reported bug's
    // actual shape): 16 segments of gently, asymmetrically varying height,
    // with a box wide enough (8 units, vs. a segment spacing of 3) to
    // simultaneously overlap many of them. The body's exact resting x is
    // perturbed by a sub-pixel amount (1e-9) each sample; every
    // overlapping segment is still compared, in the same fixed order,
    // every time, so the winning segment must stay identical across every
    // sample.
    const points = [];

    for (let i = -8; i <= 8; i++) {
      points.push({ x: i * 3, y: Math.sin(i * 0.7) * 0.4 + i * 0.01 });
    }

    const terrain = new TerrainCollider(points, 500);
    const terrainBody = body(Vec2.zero, terrain);

    const winningSegments = new Set<number>();

    for (let sample = 0; sample < 40; sample++) {
      const jitter = sample % 2 === 0 ? 1e-9 : -1e-9;
      const polygonBody = body({ x: 6 + jitter, y: 0 }, rectangle(8, 2));

      const manifold = detectPolygonTerrainCollision(polygonBody, terrainBody);

      expect(manifold).not.toBeNull();
      // Feature ids are offset by `segmentIndex * featureIdSegmentStride`
      // (1_000_000); dividing back out recovers the winning segment.
      winningSegments.add(Math.floor(manifold!.featureIds[0] / 1_000_000));
    }

    expect(winningSegments.size).toBe(1);
  });
});
