import { describe, expect, it } from 'vitest';
import { detectCircleTerrainCollision } from './detect-circle-terrain-collision.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { Vec2, Vector2 } from '../../math/index.js';

function body(
  position: Vector2,
  collider: CircleCollider | TerrainCollider,
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

describe('detectCircleTerrainCollision', () => {
  it('should return null when the circle is far above the terrain', () => {
    const circleBody = body({ x: 0, y: 100 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    expect(detectCircleTerrainCollision(circleBody, terrainBody)).toBeNull();
  });

  it('should return null when the circle is outside the terrain x-range', () => {
    const circleBody = body({ x: 500, y: 0.5 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    expect(detectCircleTerrainCollision(circleBody, terrainBody)).toBeNull();
  });

  it('should detect a collision resting mid-segment on a flat segment', () => {
    // The terrain's solid slab extends `depth` units in the +y direction
    // from its surface points (in its own local space), so a circle resting
    // "above" the surface (in world space, with no rotation applied) sits
    // at a smaller y than the surface points themselves. x = -50 is well
    // within the first segment's own span (its shared vertices are at
    // x = -100 and x = 0), so this is an unambiguous face contact, not a
    // shared-vertex boundary case.
    const circleBody = body({ x: -50, y: -0.5 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    const manifold = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(0);
    expect(manifold?.normal.y).toBeCloseTo(1);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints).toHaveLength(1);
    expect(manifold?.featureIds).toEqual([0]);
  });

  it('should pin the feature id to the shared vertex when resting exactly on a segment boundary', () => {
    // x = 0 is the surface point shared between the two segments of
    // flatTerrain(). Both segments' own contact computation independently
    // clamps to that same vertex (see detect-circle-terrain-collision.ts's
    // `contactAgainstSegment`), and the resulting feature id is pinned to
    // the vertex's own identity - offset past every valid segment index -
    // rather than to whichever segment happened to be evaluated first, so
    // warm-starting stays stable regardless of which of the two segments a
    // later tick resolves the contact against.
    const circleBody = body({ x: 0, y: -0.5 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    const manifold = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.depth).toBeCloseTo(0.5);
    // flatTerrain() has 2 segments (indices 0-1) and 3 points (indices
    // 0-2); the shared vertex is point index 1, so its canonical feature
    // id is segments.length (2) + 1 = 3.
    expect(manifold?.featureIds).toEqual([3]);
  });

  it('should pick the deepest contact across overlapping segments', () => {
    // Asymmetric slopes either side of the shared vertex give the two
    // segments genuinely different depths (well beyond DEPTH_TIE_TOLERANCE),
    // so the steeper right-hand segment should unambiguously win.
    const terrain = new TerrainCollider(
      [
        { x: -100, y: -20 },
        { x: 0, y: 0 },
        { x: 100, y: -50 },
      ],
      500,
    );
    const circleBody = body({ x: 0, y: -0.5 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, terrain);

    const manifold = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.depth).toBeCloseTo(0.5528, 3);
    expect(manifold?.featureIds).toEqual([1]);
  });

  it('should keep picking the same segment across ties that differ only by floating-point noise', () => {
    // The circle sits directly above the shared vertex of two mirror-image
    // slopes, so both segments compute mathematically identical depths -
    // differing only by a handful of ULPs of floating-point rounding, the
    // exact scenario that used to flip `featureIds` between ticks and
    // break warm-starting. Segments are always compared in the same fixed,
    // ascending-index order (see `findSurfaceContact`), so segment 0 is
    // always evaluated - and kept - first, and `DEPTH_TIE_TOLERANCE` keeps
    // it pinned against segment 1's near-identical depth.
    const terrain = new TerrainCollider(
      [
        { x: -100, y: -20 },
        { x: 0, y: 0 },
        { x: 100, y: -20 },
      ],
      500,
    );
    const circleBody = body({ x: 0, y: -0.5 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, terrain);

    const manifold = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.depth).toBeCloseTo(0.5097, 3);
    expect(manifold?.featureIds).toEqual([0]);
  });

  it('should find a genuinely deeper face on the owning segment itself when resting well within its span', () => {
    // A body resting well within a single segment's own span (nowhere near
    // a shared vertex) is the common case, and must still resolve to a
    // plain, stable, per-segment face contact exactly like flat ground.
    const terrain = new TerrainCollider(
      [
        { x: -100, y: 0 },
        { x: -10, y: -30 },
        { x: 10, y: -30 },
        { x: 100, y: 0 },
      ],
      500,
    );
    const circleBody = body({ x: 0, y: -30.5 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, terrain);

    const manifold = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.depth).toBeCloseTo(0.5, 3);
    expect(manifold?.featureIds).toEqual([1]);
  });

  it('should never flip feature ids for a wide body resting across many near-coplanar segments', () => {
    // A wide wheel resting across several segments (the reported bug's
    // actual shape): 16 segments of gently, asymmetrically varying height,
    // with a circle wide enough (radius 4, vs. a segment spacing of 3) to
    // simultaneously overlap many of them - well beyond what a single
    // segment plus its immediate neighbors could account for. The body's
    // exact resting x is perturbed by a sub-pixel amount (1e-9, the order
    // of magnitude of floating-point noise a converged solver leaves
    // between ticks) each sample; every overlapping segment is still
    // compared (not just the nearest one or two), in the same fixed order,
    // every time, so the winner must stay identical across every sample.
    const points = [];

    for (let i = -8; i <= 8; i++) {
      points.push({ x: i * 3, y: Math.sin(i * 0.7) * 0.4 + i * 0.01 });
    }

    const terrain = new TerrainCollider(points, 500);
    const terrainBody = body(Vec2.zero, terrain);
    const radius = 4;

    const featureIds = new Set<number>();

    for (let sample = 0; sample < 40; sample++) {
      const jitter = sample % 2 === 0 ? 1e-9 : -1e-9;
      const circleBody = body(
        { x: 6 + jitter, y: radius - 0.6 },
        new CircleCollider(radius),
      );

      const manifold = detectCircleTerrainCollision(circleBody, terrainBody);

      expect(manifold).not.toBeNull();
      featureIds.add(manifold!.featureIds[0]);
    }

    expect(featureIds.size).toBe(1);
  });

  it('should account for the terrain body rotation', () => {
    // Rotating the flat terrain by PI flips its solid slab to extend in
    // -y instead of +y, so a circle resting just above it (in world space)
    // still collides, with the normal flipped to match.
    const circleBody = body({ x: 0, y: 0.5 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain(), Math.PI);

    const manifold = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.y).toBeCloseTo(-1);
    expect(manifold?.depth).toBeCloseTo(0.5);
  });
});
