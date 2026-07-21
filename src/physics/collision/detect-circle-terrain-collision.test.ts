import { describe, expect, it } from 'vitest';
import { detectCircleTerrainCollision } from './detect-circle-terrain-collision.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape, TerrainShape } from '../shapes/index.js';
import { Vector2 } from '../../math/index.js';

function flatTerrainBody(): RigidBody {
  return new RigidBody({
    shape: new TerrainShape(
      [new Vector2(-5, 0), new Vector2(0, 0), new Vector2(5, 0)],
      2,
    ),
    position: Vector2.zero,
    isStatic: true,
  });
}

describe('detectCircleTerrainCollision', () => {
  it('should return null when the circle is far from the terrain', () => {
    const circleBody = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, -10),
    });

    expect(
      detectCircleTerrainCollision(circleBody, flatTerrainBody()),
    ).toBeNull();
  });

  it('should return null when the circle is outside the terrain x-range', () => {
    const circleBody = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(20, -0.5),
    });

    expect(
      detectCircleTerrainCollision(circleBody, flatTerrainBody()),
    ).toBeNull();
  });

  it('should detect a face collision resting on the terrain surface', () => {
    const circleBody = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, -0.5),
    });

    const manifold = detectCircleTerrainCollision(
      circleBody,
      flatTerrainBody(),
    );

    expect(manifold).not.toBeNull();
    expect(manifold?.bodyA).toBe(circleBody);
    expect(manifold?.normal.x).toBeCloseTo(0);
    expect(manifold?.normal.y).toBeCloseTo(1);
    expect(manifold?.depth).toBeCloseTo(0.5);
    expect(manifold?.contactPoints[0].y).toBeCloseTo(0);
  });

  it('should detect a collision spanning the boundary between two segments', () => {
    const terrainBody = flatTerrainBody();
    const circleBody = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, -0.5),
    });

    const manifold = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.depth).toBeCloseTo(0.5);
  });

  it('should account for the terrain body position offset', () => {
    const terrainBody = new RigidBody({
      shape: new TerrainShape([new Vector2(-5, 0), new Vector2(5, 0)], 2),
      position: new Vector2(100, 50),
      isStatic: true,
    });
    const circleBody = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(100, 49.5),
    });

    const manifold = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.depth).toBeCloseTo(0.5);
  });

  it('should detect a collision against a sloped segment', () => {
    const terrainBody = new RigidBody({
      shape: new TerrainShape([new Vector2(0, 0), new Vector2(10, 10)], 5),
      position: Vector2.zero,
      isStatic: true,
    });

    // Resting just above the slope's midpoint, along its outward normal.
    const midpoint = new Vector2(5, 5);
    const normal = new Vector2(1, -1).normalize();
    const circleBody = new RigidBody({
      shape: new CircleShape(1),
      position: midpoint.add(normal.multiply(0.5)),
    });

    const manifold = detectCircleTerrainCollision(circleBody, terrainBody);

    expect(manifold).not.toBeNull();
    expect(manifold?.depth).toBeCloseTo(0.5);

    // The manifold's normal points from bodyA (the circle) toward bodyB
    // (the terrain), i.e. into the ground - the opposite of the outward
    // normal the circle was placed along.
    expect(manifold?.normal.x).toBeCloseTo(-normal.x);
    expect(manifold?.normal.y).toBeCloseTo(-normal.y);
  });
});
