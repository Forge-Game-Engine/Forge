import { describe, expect, it } from 'vitest';
import { detectCircleTerrainCollision } from './detect-circle-terrain-collision.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { NarrowPhaseManifold } from '../types/collision-manifold.js';
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

/**
 * How far a contact normal tilts away from straight out of the ground.
 * Contact normals point from the circle toward the terrain, and a terrain's
 * solid slab always extends toward its own local +y, so straight out is
 * `(0, 1)` for an unrotated terrain body.
 */
function tiltFromVertical(manifold: NarrowPhaseManifold): number {
  return Math.abs(Math.atan2(manifold.normal.x, manifold.normal.y));
}

describe('detectCircleTerrainCollision', () => {
  it('should return no manifolds when the circle is far above the terrain', () => {
    const circleBody = body({ x: 0, y: 100 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    expect(detectCircleTerrainCollision(circleBody, terrainBody)).toEqual([]);
  });

  it('should return no manifolds when the circle is outside the terrain x-range', () => {
    const circleBody = body({ x: 500, y: 0.5 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    expect(detectCircleTerrainCollision(circleBody, terrainBody)).toEqual([]);
  });

  it('should detect a collision resting mid-edge on a flat surface edge', () => {
    // The terrain's solid slab extends `depth` units in the +y direction
    // from its surface points (in its own local space), so a circle resting
    // "above" the surface (in world space, with no rotation applied) sits
    // at a smaller y than the surface points themselves. x = -50 is well
    // within the first edge's own span (its endpoints are at x = -100 and
    // x = 0), so this is an unambiguous face contact, not a shared-vertex
    // boundary case.
    const circleBody = body({ x: -50, y: -0.5 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    const manifolds = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].normal.x).toBeCloseTo(0);
    expect(manifolds[0].normal.y).toBeCloseTo(1);
    expect(manifolds[0].depth).toBeCloseTo(0.5);
    expect(manifolds[0].contactPoints).toHaveLength(1);
    expect(manifolds[0].featureIds).toEqual([0]);
  });

  it('should report one contact, pinned to the shared vertex, when resting exactly on an edge boundary', () => {
    // x = 0 is the surface point shared between the two edges of
    // flatTerrain(). Both edges see the circle's center fall past their own
    // end of the chain, so both resolve the contact to that same point -
    // and it is reported once, with a feature id pinned to the vertex's own
    // identity (offset past every valid edge index) rather than to
    // whichever edge happened to be walked first.
    const circleBody = body({ x: 0, y: -0.5 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    const manifolds = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].depth).toBeCloseTo(0.5);
    expect(manifolds[0].normal.y).toBeCloseTo(1);
    // flatTerrain() has 2 edges (indices 0-1) and 3 points (indices 0-2);
    // the shared vertex is point index 1, so its feature id is
    // surface.length (2) + 1 = 3.
    expect(manifolds[0].featureIds).toEqual([3]);
  });

  it('should report one contact per side of a valley the circle is wedged into', () => {
    // Two slopes meeting at a point the ground folds inward at. The circle
    // genuinely touches both of them, and a single contact could only hold
    // it against one - so both are reported, each with its own side's
    // surface normal.
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

    const manifolds = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifolds).toHaveLength(2);
    expect(manifolds[0].featureIds).toEqual([0]);
    expect(manifolds[1].featureIds).toEqual([1]);
    // Mirror-image slopes, so the two contacts are mirror images too -
    // no tie to break, and nothing for floating-point noise to decide.
    expect(manifolds[0].depth).toBeCloseTo(manifolds[1].depth, 12);
    expect(manifolds[0].normal.x).toBeCloseTo(-manifolds[1].normal.x, 12);
    expect(manifolds[0].contactPoints[0].x).toBeLessThan(0);
    expect(manifolds[1].contactPoints[0].x).toBeGreaterThan(0);
  });

  it('should take the normal from the surface gradient on a slope', () => {
    // A 45 degree slope pushes out at 45 degrees, not straight up.
    const terrain = new TerrainCollider(
      [
        { x: -100, y: 100 },
        { x: 100, y: -100 },
      ],
      500,
    );
    const circleBody = body({ x: 0, y: -Math.SQRT1_2 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, terrain);

    const manifolds = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].normal.x).toBeCloseTo(Math.SQRT1_2);
    expect(manifolds[0].normal.y).toBeCloseTo(Math.SQRT1_2);
    expect(manifolds[0].depth).toBeCloseTo(0.5);
  });

  it('should find the owning edge when resting well within its span', () => {
    // A body resting well within a single edge's own span (nowhere near a
    // shared vertex) is the common case, and must still resolve to a plain,
    // stable, per-edge face contact exactly like flat ground.
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

    const manifolds = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].depth).toBeCloseTo(0.5, 3);
    expect(manifolds[0].featureIds).toEqual([1]);
  });

  it('should never contact a surface edge whose stretch of ground it does not reach', () => {
    // A wheel wide enough to span many edges at once (radius 4 against an
    // edge spacing of 3) overlaps far more of them than it touches. Only
    // the one stretch of ground under it may report a contact: the edges
    // either side own their own stretches, and there is no interior face
    // between them for the wheel to catch on.
    const points: Vector2[] = [];

    for (let i = -8; i <= 8; i++) {
      points.push({ x: i * 3, y: i * 0.01 });
    }

    const terrain = new TerrainCollider(points, 500);
    const circleBody = body({ x: 1.5, y: -4 + 0.02 }, new CircleCollider(4));
    const terrainBody = body(Vec2.zero, terrain);

    const manifolds = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifolds).toHaveLength(1);
    expect(tiltFromVertical(manifolds[0])).toBeLessThan(0.02);
  });

  it('should keep the same contact for a settled wide body across sub-pixel jitter', () => {
    // A wide wheel resting across several near-coplanar edges (the reported
    // bug's actual shape): 16 edges of gently, asymmetrically varying
    // height, with a circle wide enough (radius 4, vs. an edge spacing of
    // 3) to simultaneously overlap many of them. The body's exact resting x
    // is perturbed by a sub-pixel amount (1e-9, the order of magnitude of
    // floating-point noise a converged solver leaves between ticks) each
    // sample. Which surface features are in contact is decided by geometry
    // alone - never by comparing near-tied penetration depths - so the
    // answer cannot change.
    const points: Vector2[] = [];

    for (let i = -8; i <= 8; i++) {
      points.push({ x: i * 3, y: Math.sin(i * 0.7) * 0.4 + i * 0.01 });
    }

    const terrain = new TerrainCollider(points, 500);
    const terrainBody = body(Vec2.zero, terrain);
    const radius = 4;
    const featureIds = new Set<string>();

    for (let sample = 0; sample < 40; sample++) {
      const jitter = sample % 2 === 0 ? 1e-9 : -1e-9;
      const circleBody = body(
        { x: 6 + jitter, y: radius - 0.6 },
        new CircleCollider(radius),
      );

      const manifolds = detectCircleTerrainCollision(circleBody, terrainBody);

      expect(manifolds.length).toBeGreaterThan(0);
      featureIds.add(JSON.stringify(manifolds.map((m) => m.featureIds)));
    }

    expect(featureIds.size).toBe(1);
  });

  it('should push a circle that has sunk below the surface back out along it', () => {
    // The surface is one-sided, so sinking into it must not turn the
    // contact around: the normal still points out of the ground, and the
    // depth grows past the circle's own radius.
    const circleBody = body({ x: -50, y: 0.25 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    const manifolds = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].normal.x).toBeCloseTo(0);
    expect(manifolds[0].normal.y).toBeCloseTo(1);
    expect(manifolds[0].depth).toBeCloseTo(1.25);
  });

  it('should ignore a circle that has passed out of the bottom of the slab', () => {
    // `depth` is what bounds the terrain's solid. A body entirely below it
    // has fallen through rather than being dragged all the way back up.
    const circleBody = body({ x: -50, y: 60 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    expect(detectCircleTerrainCollision(circleBody, terrainBody)).toEqual([]);
  });

  it('should round the terrain off at the ends of the chain', () => {
    // The chain simply stops at its last point, so a body past the end
    // rolls off it rather than meeting a wall there.
    const circleBody = body({ x: 100.5, y: -0.5 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    const manifolds = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].contactPoints[0].x).toBeCloseTo(100);
    // Radial about the final point, so the normal leans out past the end
    // instead of pointing straight up out of the last edge.
    expect(manifolds[0].normal.x).toBeCloseTo(-Math.SQRT1_2);
    expect(manifolds[0].normal.y).toBeCloseTo(Math.SQRT1_2);
  });

  it('should return no manifolds when the circle is out of reach of an edge it is squarely above', () => {
    // x = -50 puts the circle's center squarely inside the first edge's own
    // span, so the edge is a candidate and resolves to a face contact -
    // which still has to be rejected on the face's own separation, rather
    // than on the circle failing to reach either of the edge's endpoints.
    const circleBody = body({ x: -50, y: -5 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    expect(detectCircleTerrainCollision(circleBody, terrainBody)).toEqual([]);
  });

  it('should return no manifolds when the circle is past the end of the chain and out of reach', () => {
    // Diagonally off the last surface point by more than a radius: the
    // circle's center falls past the end of every edge it overlaps in x, so
    // the only feature left to reach is that point itself.
    const circleBody = body({ x: 101, y: -1 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    expect(detectCircleTerrainCollision(circleBody, terrainBody)).toEqual([]);
  });

  it('should fall back to the surface normal when the circle sits exactly on a surface point', () => {
    // The radial direction from the point to the circle's center is what
    // normally gives a vertex contact its normal, and here it is exactly
    // zero-length, so the owning edge's own normal has to stand in for it.
    const circleBody = body({ x: 100, y: 0 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    const manifolds = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].normal.x).toBeCloseTo(0);
    expect(manifolds[0].normal.y).toBeCloseTo(1);
    expect(manifolds[0].depth).toBeCloseTo(1);
    expect(manifolds[0].contactPoints[0]).toEqual({ x: 100, y: 0 });
  });

  it('should round the terrain off at the start of the chain too', () => {
    // The mirror of rounding off at the end: the first edge has no
    // neighbor to its left, so a body past that end meets the chain's first
    // point with nothing to hand the contact off to.
    const circleBody = body({ x: -100.5, y: -0.5 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain());

    const manifolds = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].contactPoints[0].x).toBeCloseTo(-100);
    expect(manifolds[0].normal.x).toBeCloseTo(Math.SQRT1_2);
    expect(manifolds[0].normal.y).toBeCloseTo(Math.SQRT1_2);
    // `surface.length` (2) + point index 0.
    expect(manifolds[0].featureIds).toEqual([2]);
  });

  it('should account for the terrain body rotation', () => {
    // Rotating the flat terrain by PI flips its solid slab to extend in
    // -y instead of +y, so a circle resting just above it (in world space)
    // still collides, with the normal flipped to match.
    const circleBody = body({ x: 0, y: 0.5 }, new CircleCollider(1));
    const terrainBody = body(Vec2.zero, flatTerrain(), Math.PI);

    const manifolds = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].normal.y).toBeCloseTo(-1);
    expect(manifolds[0].depth).toBeCloseTo(0.5);
  });

  it('should never tilt a normal further than the ground it was found on', () => {
    // Rolling a wide wheel the whole way across a rolling heightmap whose
    // steepest sampled slope is 20 degrees. Every contact it reports, at
    // every position, must push it out of the ground - never sideways along
    // it, which is what an interior boundary between two neighboring
    // stretches of ground used to be able to do.
    const maxSlopeAngle = (20 * Math.PI) / 180;
    const spacing = 0.3;
    const frequency = 0.19;
    const amplitude = (Math.tan(maxSlopeAngle) * spacing) / frequency;
    const surfaceY = (x: number): number =>
      Math.sin((x / spacing) * frequency) * amplitude;
    const points: Vector2[] = [];

    for (let i = -60; i <= 60; i++) {
      points.push({ x: i * spacing, y: surfaceY(i * spacing) });
    }

    const terrain = new TerrainCollider(points, 500);
    const terrainBody = body(Vec2.zero, terrain);
    const radius = 3;
    let contactCount = 0;

    for (let step = 0; step < 300; step++) {
      const x = -8 + step * 0.05;
      const circleBody = body(
        { x, y: surfaceY(x) - radius + 0.05 },
        new CircleCollider(radius),
      );

      const manifolds = detectCircleTerrainCollision(circleBody, terrainBody);

      expect(manifolds.length).toBeGreaterThan(0);

      for (const manifold of manifolds) {
        contactCount++;
        expect(tiltFromVertical(manifold)).toBeLessThanOrEqual(
          maxSlopeAngle + 1e-6,
        );
      }
    }

    expect(contactCount).toBeGreaterThanOrEqual(300);
  });
});
