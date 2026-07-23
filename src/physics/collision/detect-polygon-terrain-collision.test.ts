import { describe, expect, it } from 'vitest';
import { detectPolygonTerrainCollision } from './detect-polygon-terrain-collision.js';
import { RigidBody } from '../rigid-body.js';
import { PolygonShape, TerrainShape } from '../shapes/index.js';
import { Vector2 } from '../../math/index.js';

function flatTerrainBody(options: { angle?: number } = {}): RigidBody {
  return new RigidBody({
    shape: new TerrainShape(
      [new Vector2(-5, 0), new Vector2(0, 0), new Vector2(5, 0)],
      2,
    ),
    position: Vector2.zero,
    angle: options.angle ?? 0,
    isStatic: true,
  });
}

describe('detectPolygonTerrainCollision', () => {
  it('should return null when the polygon does not overlap the terrain', () => {
    const polygonBody = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, -10),
    });

    expect(
      detectPolygonTerrainCollision(polygonBody, flatTerrainBody()),
    ).toBeNull();
  });

  it('should return null when the polygon is outside the terrain x-range', () => {
    const polygonBody = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(20, 0),
    });

    expect(
      detectPolygonTerrainCollision(polygonBody, flatTerrainBody()),
    ).toBeNull();
  });

  it('should detect a box resting into the terrain surface', () => {
    const polygonBody = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0, -0.5),
    });

    const manifold = detectPolygonTerrainCollision(
      polygonBody,
      flatTerrainBody(),
    );

    expect(manifold).not.toBeNull();
    expect(manifold?.bodyA).toBe(polygonBody);
    expect(manifold?.normal.x).toBeCloseTo(0);
    expect(manifold?.normal.y).toBeCloseTo(1);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints).toHaveLength(2);
  });

  it('should detect a box spanning the boundary between two segments', () => {
    const polygonBody = new RigidBody({
      shape: PolygonShape.rectangle(4, 2),
      position: new Vector2(0, -0.5),
    });

    const manifold = detectPolygonTerrainCollision(
      polygonBody,
      flatTerrainBody(),
    );

    expect(manifold).not.toBeNull();
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints).toHaveLength(2);
  });

  it('should account for the terrain body rotation', () => {
    const angle = Math.PI / 2;
    const terrainBody = flatTerrainBody({ angle });

    // Rotating the flat terrain 90 degrees turns its surface into a wall
    // facing in -x; a box pushed 0.5 units into it from the +x side should
    // collide with a normal pointing back out along +x.
    const polygonBody = new RigidBody({
      shape: PolygonShape.rectangle(2, 2),
      position: new Vector2(0.5, 0),
    });

    const manifold = detectPolygonTerrainCollision(polygonBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(-1);
    expect(manifold?.normal.y).toBeCloseTo(0);
    expect(manifold?.depth).toBeCloseTo(0.5);
  });
});
