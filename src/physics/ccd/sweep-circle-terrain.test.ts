import { describe, expect, it } from 'vitest';
import { Vec2, Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { sweepCircleTerrain } from './sweep-circle-terrain.js';

function terrainBody(
  collider: TerrainCollider,
  rotation: number = 0,
): CollisionBody {
  return { position: Vec2.zero, rotation, collider };
}

function flatTerrain(): TerrainCollider {
  return new TerrainCollider(
    [
      { x: -1000, y: 0 },
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
    ],
    500,
  );
}

function movingCircleBody(radius: number): CollisionBody {
  return {
    position: { x: 0, y: 0 },
    rotation: 0,
    collider: new CircleCollider(radius),
  };
}

describe('sweepCircleTerrain', () => {
  it('returns null when the swept circle is outside the terrain x-range', () => {
    const hit = sweepCircleTerrain(
      movingCircleBody(1),
      terrainBody(flatTerrain()),
      { x: 5000, y: -10 },
      { x: 5000, y: 10 },
    );

    expect(hit).toBeNull();
  });

  it('finds the earliest time of impact against the surface from above', () => {
    const radius = 1;

    const hit = sweepCircleTerrain(
      movingCircleBody(radius),
      terrainBody(flatTerrain()),
      { x: 0, y: -10 },
      { x: 0, y: 10 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(0);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(0);
    expect(hit?.normal.y).toBeCloseTo(-1);
    // The circle first touches y=0 once its center reaches y=-radius, 9
    // units into the 20-unit swept translation.
    expect(hit?.t).toBeCloseTo((10 - radius) / 20);
  });

  it('returns a t of 0 when the circle already overlaps the terrain at the start position', () => {
    const hit = sweepCircleTerrain(
      movingCircleBody(1),
      terrainBody(flatTerrain()),
      { x: 0, y: 0 },
      { x: 0, y: 10 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.t).toBe(0);
  });

  it('accounts for the terrain body rotation', () => {
    // Rotating the flat terrain by PI flips its solid slab to extend in -y
    // instead of +y, so a circle falling in -y (from a larger y toward a
    // smaller one) now lands on the surface from underneath, with the
    // normal flipped to match - the same convention
    // `documentation-site/docs/docs/physics/terrain.md` documents.
    const hit = sweepCircleTerrain(
      movingCircleBody(1),
      terrainBody(flatTerrain(), Math.PI),
      { x: 0, y: 10 },
      { x: 0, y: -10 },
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.y).toBeCloseTo(1);
  });

  it('reproduces the diagnosed Car demo wheel-through-terrain scenario without tunneling', () => {
    // Mirrors the Car demo's diagnosed bug (see design/continuous-collision-
    // detection.md, §1 and §3): a `wheelRadius: 100` circle traveling fast
    // enough to cover ~20-25 world units in a single 60Hz tick. Starting
    // just 5 units above its resting contact height and moving the same
    // ~23-unit single-tick translation the diagnosis measured would - with
    // ordinary discrete, start-of-tick-only detection - land the wheel
    // over 18 units deep in the terrain before anything notices. The sweep
    // must catch the crossing within this same tick instead.
    const radius = 100;
    const restingHeight = -radius;
    // "Above" the surface means further into the free-space side (a more
    // negative y - see the un-rotated flat-terrain convention above).
    const startPosition: Vector2 = { x: 0, y: restingHeight - 5 };
    const tickTranslation = 1400 / 60;
    const endPosition: Vector2 = {
      x: 0,
      y: startPosition.y + tickTranslation,
    };

    // Confirms this scenario really would tunnel deep into the terrain
    // without CCD, matching the diagnosed bug's order of magnitude.
    expect(endPosition.y - restingHeight).toBeGreaterThan(15);

    const hit = sweepCircleTerrain(
      movingCircleBody(radius),
      terrainBody(flatTerrain()),
      startPosition,
      endPosition,
    );

    expect(hit).not.toBeNull();
    expect(hit?.point.y).toBeCloseTo(0);

    const clampedY =
      startPosition.y + (hit?.t ?? 0) * (endPosition.y - startPosition.y);

    // The clamped translation should land the wheel essentially exactly at
    // its resting contact height, not tens of units past it.
    expect(Math.abs(clampedY - restingHeight)).toBeLessThan(0.01);
  });
});
