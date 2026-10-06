import { describe, expect, it } from 'vitest';
import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { sweepCircleTerrain } from './sweep-circle-terrain.js';

/**
 * Terrain bodies here are unrotated unless stated otherwise, so their solid
 * slab extends toward +y and their surface faces -y.
 */
function terrainBody(points: Vector2[], rotation: number = 0): CollisionBody {
  return {
    position: { x: 0, y: 0 },
    rotation,
    collider: new TerrainCollider(points, 100),
  };
}

const flatGround = [
  { x: -500, y: 0 },
  { x: 0, y: 0 },
  { x: 500, y: 0 },
];

describe('sweepCircleTerrain', () => {
  const circle = new CircleCollider(10);

  it('should find where a falling circle first touches the surface', () => {
    const hit = sweepCircleTerrain(
      circle,
      terrainBody(flatGround),
      { x: 100, y: -100 },
      { x: 100, y: 100 },
    );

    expect(hit?.t).toBeCloseTo(0.45);
    expect(hit?.normal.x).toBeCloseTo(0);
    expect(hit?.normal.y).toBeCloseTo(-1);
    expect(hit?.point.x).toBeCloseTo(100);
    expect(hit?.point.y).toBeCloseTo(0);
  });

  it("should sweep against the terrain's rotated world pose", () => {
    // Rotated half a turn, the surface faces +y, as in a world where
    // gravity pulls toward -y.
    const hit = sweepCircleTerrain(
      circle,
      terrainBody(flatGround, Math.PI),
      { x: 100, y: 100 },
      { x: 100, y: -100 },
    );

    expect(hit?.t).toBeCloseTo(0.45);
    expect(hit?.normal.x).toBeCloseTo(0);
    expect(hit?.normal.y).toBeCloseTo(1);
    expect(hit?.point.y).toBeCloseTo(0);
  });

  it('should return null for a sweep that stays above the surface', () => {
    expect(
      sweepCircleTerrain(
        circle,
        terrainBody(flatGround),
        { x: -100, y: -50 },
        { x: 100, y: -50 },
      ),
    ).toBeNull();
  });

  it('should ignore the edge a circle is resting on but find a wall it runs into', () => {
    const steppedGround = [
      { x: -500, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: -200 },
      { x: 500, y: -200 },
    ];

    // Resting 0.5 units into the flat edge, rolling right into the wall.
    const hit = sweepCircleTerrain(
      circle,
      terrainBody(steppedGround),
      { x: -100, y: -9.5 },
      { x: 100, y: -9.5 },
    );

    expect(hit?.t).toBeCloseTo(0.45, 2);
    expect(hit?.normal.x).toBeCloseTo(-1, 3);
  });

  it('should not catch on the corner of a crest the circle rolls over', () => {
    const crest = [
      { x: -500, y: 0 },
      { x: 0, y: 0 },
      { x: 500, y: 100 },
    ];

    expect(
      sweepCircleTerrain(
        circle,
        terrainBody(crest),
        { x: -100, y: -9.5 },
        { x: 100, y: -9.5 },
      ),
    ).toBeNull();
  });

  it('should not catch on the joints between nearly flat edges', () => {
    const ripples: Vector2[] = [];

    for (let i = -20; i <= 20; i++) {
      ripples.push({ x: i * 25, y: i % 2 === 0 ? 0 : 0.01 });
    }

    expect(
      sweepCircleTerrain(
        circle,
        terrainBody(ripples),
        { x: -200, y: -9.5 },
        { x: 200, y: -9.5 },
      ),
    ).toBeNull();
  });

  it('should hit the corner of a crest the circle drops onto', () => {
    const crest = [
      { x: -500, y: 100 },
      { x: 0, y: 0 },
      { x: 500, y: 100 },
    ];

    const hit = sweepCircleTerrain(
      circle,
      terrainBody(crest),
      { x: 0, y: -100 },
      { x: 0, y: 100 },
    );

    expect(hit?.t).toBeCloseTo(0.45);
    expect(hit?.point.x).toBeCloseTo(0);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.y).toBeCloseTo(-1);
  });

  it('should return null for a sweep that starts below the surface', () => {
    expect(
      sweepCircleTerrain(
        circle,
        terrainBody(flatGround),
        { x: 100, y: 20 },
        { x: 100, y: 80 },
      ),
    ).toBeNull();
  });
});
