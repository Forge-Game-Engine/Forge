import { describe, expect, it } from 'vitest';
import { detectPolygonTerrainCollision } from './detect-polygon-terrain-collision.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { NarrowPhaseManifold } from '../types/collision-manifold.js';
import { Vec2, Vector2 } from '../../math/index.js';

/**
 * The stride `detectPolygonTerrainCollision` offsets each surface edge's
 * feature ids by, mirrored here so a test can recover which edge a contact
 * came from.
 */
const featureIdEdgeStride = 2_097_152;

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

function edgeIndicesOf(manifolds: NarrowPhaseManifold[]): number[] {
  return manifolds.map((manifold) =>
    Math.floor(manifold.featureIds[0] / featureIdEdgeStride),
  );
}

/**
 * How far a contact normal tilts away from straight out of the ground.
 * Contact normals point from the polygon toward the terrain, and a terrain's
 * solid slab always extends toward its own local +y, so straight out is
 * `(0, 1)` for an unrotated terrain body.
 */
function tiltFromVertical(manifold: NarrowPhaseManifold): number {
  return Math.abs(Math.atan2(manifold.normal.x, manifold.normal.y));
}

describe('detectPolygonTerrainCollision', () => {
  it('should return no manifolds when the polygon is above the terrain with a gap', () => {
    const polygonBody = body({ x: 0, y: -1.5 }, rectangle(2, 2));
    const terrainBody = body(Vec2.zero, flatTerrain());

    expect(detectPolygonTerrainCollision(polygonBody, terrainBody)).toEqual([]);
  });

  it('should return no manifolds when the polygon is outside the terrain x-range', () => {
    const polygonBody = body({ x: 500, y: -0.5 }, rectangle(2, 2));
    const terrainBody = body(Vec2.zero, flatTerrain());

    expect(detectPolygonTerrainCollision(polygonBody, terrainBody)).toEqual([]);
  });

  it('should detect a collision resting on a flat surface edge', () => {
    // Mirrors detectCircleTerrainCollision's tests: the terrain's solid
    // slab extends in +y locally, so a polygon resting "above" the surface
    // in world space (unrotated) sits at a smaller y than the surface.
    // x = -50 keeps the box within a single edge's span.
    const polygonBody = body({ x: -50, y: -0.5 }, rectangle(2, 2));
    const terrainBody = body(Vec2.zero, flatTerrain());

    const manifolds = detectPolygonTerrainCollision(polygonBody, terrainBody);

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].normal.x).toBeCloseTo(0);
    expect(manifolds[0].normal.y).toBeCloseTo(1);
    expect(manifolds[0].depth).toBeCloseTo(0.5);
    expect(manifolds[0].contactPoints).toHaveLength(2);
  });

  it('should contribute one manifold per surface edge the polygon straddles', () => {
    // A box wide enough to cross the boundary between the two edges gets a
    // contact against each, each clipped to its own edge's stretch of
    // ground - rather than one contact on whichever edge happened to come
    // out deepest.
    const polygonBody = body({ x: 0, y: -0.5 }, rectangle(2, 2));
    const terrainBody = body(Vec2.zero, flatTerrain());

    const manifolds = detectPolygonTerrainCollision(polygonBody, terrainBody);

    expect(edgeIndicesOf(manifolds)).toEqual([0, 1]);

    for (const manifold of manifolds) {
      expect(manifold.normal.y).toBeCloseTo(1);
      expect(manifold.depth).toBeCloseTo(0.5);
    }

    expect(manifolds[0].contactPoints.every((point) => point.x <= 0)).toBe(
      true,
    );
    expect(manifolds[1].contactPoints.every((point) => point.x >= 0)).toBe(
      true,
    );
  });

  it('should keep every contact point of a straddling body on a distinct feature id', () => {
    const polygonBody = body({ x: 0, y: -0.5 }, rectangle(2, 2));
    const terrainBody = body(Vec2.zero, flatTerrain());

    const manifolds = detectPolygonTerrainCollision(polygonBody, terrainBody);
    const featureIds = manifolds.flatMap((manifold) => manifold.featureIds);

    expect(featureIds.every((featureId) => featureId >= 0)).toBe(true);
    expect(new Set(featureIds).size).toBe(featureIds.length);
  });

  it('should report one contact per side of a valley the polygon is wedged into', () => {
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

    const manifolds = detectPolygonTerrainCollision(polygonBody, terrainBody);

    expect(edgeIndicesOf(manifolds)).toEqual([0, 1]);
    // Mirror-image slopes, so nothing distinguishes the two sides but their
    // sign - there is no tie for floating-point noise to break.
    expect(manifolds[0].depth).toBeCloseTo(manifolds[1].depth, 12);
    expect(manifolds[0].normal.x).toBeCloseTo(-manifolds[1].normal.x, 12);
    expect(manifolds[0].contactPoints.every((point) => point.x <= 0)).toBe(
      true,
    );
    expect(manifolds[1].contactPoints.every((point) => point.x >= 0)).toBe(
      true,
    );
  });

  it('should take the normal from the surface gradient on a slope', () => {
    const terrain = new TerrainCollider(
      [
        { x: -100, y: 100 },
        { x: 100, y: -100 },
      ],
      500,
    );
    const polygonBody = body(
      { x: 0, y: -Math.SQRT1_2 },
      rectangle(2, 2),
      -Math.PI / 4,
    );
    const terrainBody = body(Vec2.zero, terrain);

    const manifolds = detectPolygonTerrainCollision(polygonBody, terrainBody);

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].normal.x).toBeCloseTo(Math.SQRT1_2);
    expect(manifolds[0].normal.y).toBeCloseTo(Math.SQRT1_2);
  });

  it('should never push a body sideways along ground it is resting on', () => {
    // The exact shape of the reported bug, at its smallest: a box resting
    // on rolling ground whose steepest stretch is only 16.7 degrees, wide
    // enough to straddle three of its surface edges at once. Closing each
    // stretch of ground off into its own quadrilateral gave the boundary
    // between two neighboring ones a face pointing straight along the
    // ground, and it beat every real surface face on penetration depth -
    // so the body resting on the hillside was shoved horizontally, hard
    // (a full 90 degrees off, at ten times the depth of the real contact).
    // The surface chain has no such face to find.
    const maxSlopeAngle = Math.atan(0.3);
    const terrain = new TerrainCollider(
      [
        { x: 0, y: -0.2 },
        { x: 1, y: -0.2 },
        { x: 2, y: -0.3 },
        { x: 3, y: 0 },
        { x: 4, y: 0.3 },
        { x: 5, y: 0.1 },
      ],
      500,
    );
    const polygonBody = body({ x: 4, y: -0.65 }, rectangle(3, 2));
    const terrainBody = body(Vec2.zero, terrain);

    const manifolds = detectPolygonTerrainCollision(polygonBody, terrainBody);

    expect(manifolds.length).toBeGreaterThan(0);

    for (const manifold of manifolds) {
      expect(tiltFromVertical(manifold)).toBeLessThanOrEqual(
        maxSlopeAngle + 1e-6,
      );
      expect(manifold.normal.y).toBeGreaterThan(0);
    }
  });

  it('should keep the same contacts for a settled wide body across sub-pixel jitter', () => {
    // A wide box resting across several edges (the reported bug's actual
    // shape): 16 edges of gently, asymmetrically varying height, with a box
    // wide enough (8 units, vs. an edge spacing of 3) to simultaneously
    // overlap many of them. The body's exact resting x is perturbed by a
    // sub-pixel amount (1e-9) each sample; every edge it straddles keeps
    // its own contact, so there is no winner to change hands.
    const points: Vector2[] = [];

    for (let i = -8; i <= 8; i++) {
      points.push({ x: i * 3, y: Math.sin(i * 0.7) * 0.4 + i * 0.01 });
    }

    const terrain = new TerrainCollider(points, 500);
    const terrainBody = body(Vec2.zero, terrain);
    const featureIds = new Set<string>();

    for (let sample = 0; sample < 40; sample++) {
      const jitter = sample % 2 === 0 ? 1e-9 : -1e-9;
      const polygonBody = body({ x: 6 + jitter, y: 0 }, rectangle(8, 2));

      const manifolds = detectPolygonTerrainCollision(polygonBody, terrainBody);

      expect(manifolds.length).toBeGreaterThan(1);
      featureIds.add(
        JSON.stringify(manifolds.map((manifold) => manifold.featureIds)),
      );
    }

    expect(featureIds.size).toBe(1);
  });

  it('should ignore a polygon that has passed out of the bottom of the slab', () => {
    const polygonBody = body({ x: -50, y: 60 }, rectangle(2, 2));
    const terrainBody = body(Vec2.zero, flatTerrain());

    expect(detectPolygonTerrainCollision(polygonBody, terrainBody)).toEqual([]);
  });

  it('should account for the terrain body rotation', () => {
    const polygonBody = body({ x: -50, y: 0.5 }, rectangle(2, 2));
    const terrainBody = body(Vec2.zero, flatTerrain(), Math.PI);

    const manifolds = detectPolygonTerrainCollision(polygonBody, terrainBody);

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].normal.y).toBeCloseTo(-1);
    expect(manifolds[0].depth).toBeCloseTo(0.5);
  });

  it('should never tilt a normal further than the ground and the body it was found between', () => {
    // Sliding a wide, slightly tilted box the whole way across a rolling
    // heightmap whose steepest sampled slope is 20 degrees. A contact may
    // resolve against the ground (at most 20 degrees off) or against the
    // box's own resting face (a further 6 degrees, its tilt), and never
    // against anything else - in particular never against a boundary
    // between two neighboring stretches of ground, which is what used to
    // produce a fully horizontal push.
    const maxSlopeAngle = (20 * Math.PI) / 180;
    const bodyTilt = (6 * Math.PI) / 180;
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
    let contactCount = 0;

    for (let step = 0; step < 300; step++) {
      const x = -8 + step * 0.05;
      const polygonBody = body(
        { x, y: surfaceY(x) - 1 + 0.05 },
        rectangle(5, 2),
        bodyTilt,
      );

      const manifolds = detectPolygonTerrainCollision(polygonBody, terrainBody);

      expect(manifolds.length).toBeGreaterThan(0);

      for (const manifold of manifolds) {
        contactCount++;
        expect(tiltFromVertical(manifold)).toBeLessThanOrEqual(
          maxSlopeAngle + bodyTilt + 1e-6,
        );
      }
    }

    expect(contactCount).toBeGreaterThan(300);
  });
});
