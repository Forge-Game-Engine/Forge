import { describe, expect, it } from 'vitest';
import { createTerrainBodies } from './create-terrain-bodies.js';
import { Vector2 } from '../../math/index.js';
import { PhysicsWorld } from '../physics-world.js';
import { RigidBody } from '../rigid-body.js';
import { CircleShape } from '../shapes/index.js';

describe('createTerrainBodies', () => {
  it('should throw when fewer than 2 points are provided', () => {
    expect(() => createTerrainBodies([Vector2.zero])).toThrow();
  });

  it('should create one static body per consecutive pair of points', () => {
    const points = [
      new Vector2(0, 0),
      new Vector2(10, 0),
      new Vector2(20, 5),
      new Vector2(30, 5),
    ];

    const bodies = createTerrainBodies(points);

    expect(bodies).toHaveLength(3);

    for (const body of bodies) {
      expect(body.isStatic).toBe(true);
    }
  });

  it('should position each segment at the midpoint of its two points', () => {
    const points = [new Vector2(0, 0), new Vector2(10, 0)];

    const [body] = createTerrainBodies(points);

    expect(body.position.x).toBeCloseTo(5);
    expect(body.position.y).toBeCloseTo(0);
  });

  it('should orient each segment along the direction between its two points', () => {
    const points = [new Vector2(0, 0), new Vector2(0, 10)];

    const [body] = createTerrainBodies(points);

    expect(body.angle).toBeCloseTo(Math.PI / 2);
  });

  it('should skip degenerate segments where consecutive points are identical', () => {
    const points = [new Vector2(0, 0), new Vector2(0, 0), new Vector2(10, 0)];

    const bodies = createTerrainBodies(points);

    expect(bodies).toHaveLength(1);
  });

  it('should apply the provided friction and restitution to every segment', () => {
    const points = [new Vector2(0, 0), new Vector2(10, 0), new Vector2(20, 0)];

    const bodies = createTerrainBodies(points, {
      friction: 0.9,
      restitution: 0.1,
    });

    for (const body of bodies) {
      expect(body.friction).toBeCloseTo(0.9);
      expect(body.restitution).toBeCloseTo(0.1);
    }
  });

  it('should support a dropped circle settling on the generated strip, including across a segment seam', () => {
    const points = [new Vector2(-10, 5), new Vector2(0, 5), new Vector2(10, 5)];

    const bodies = createTerrainBodies(points, { thickness: 1 });
    const world = new PhysicsWorld({ gravity: new Vector2(0, 10) });

    for (const body of bodies) {
      world.addBody(body);
    }

    const droppedBody = new RigidBody({
      shape: new CircleShape(1),
      position: new Vector2(0, 2),
      restitution: 0,
    });

    world.addBody(droppedBody);

    for (let i = 0; i < 120; i++) {
      world.step(1 / 60);
    }

    expect(droppedBody.position.y).toBeLessThan(6);
    expect(droppedBody.velocity.y).toBeCloseTo(0, 0);
  });
});
