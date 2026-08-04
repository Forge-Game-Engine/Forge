import { describe, expect, it } from 'vitest';
import { detectCollision } from './detect-collision.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { Collider } from '../colliders/collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { Vec2, Vector2 } from '../../math/index.js';

function rectangle(width: number, height: number): PolygonCollider {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return new PolygonCollider([
    Vec2.create(-halfWidth, -halfHeight),
    Vec2.create(halfWidth, -halfHeight),
    Vec2.create(halfWidth, halfHeight),
    Vec2.create(-halfWidth, halfHeight),
  ]);
}

function body(position: Vector2, collider: Collider): CollisionBody {
  return { position, rotation: 0, collider };
}

describe('detectCollision', () => {
  it('should dispatch circle-circle collisions', () => {
    const bodyA = body(Vec2.create(0, 0), new CircleCollider(1));
    const bodyB = body(Vec2.create(1.5, 0), new CircleCollider(1));

    expect(detectCollision(bodyA, bodyB)).not.toBeNull();
  });

  it('should dispatch circle-polygon collisions', () => {
    const bodyA = body(Vec2.create(0, -1.5), new CircleCollider(1));
    const bodyB = body(Vec2.create(0, 0), rectangle(2, 2));

    const manifold = detectCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(0);
    expect(manifold?.normal.y).toBeCloseTo(1);
  });

  it('should dispatch polygon-circle collisions, flipping the normal', () => {
    const bodyA = body(Vec2.create(0, 0), rectangle(2, 2));
    const bodyB = body(Vec2.create(0, -1.5), new CircleCollider(1));

    const manifold = detectCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(0);
    expect(manifold?.normal.y).toBeCloseTo(-1);
    expect(manifold?.depth).toBeCloseTo(0.5);
  });

  it('should dispatch polygon-polygon collisions', () => {
    const bodyA = body(Vec2.create(0, 0), rectangle(2, 2));
    const bodyB = body(Vec2.create(1.5, 0), rectangle(2, 2));

    const manifold = detectCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.x).toBeCloseTo(1);
    expect(manifold?.normal.y).toBeCloseTo(0);
  });

  it('should dispatch circle-terrain collisions', () => {
    const terrain = new TerrainCollider(
      [Vec2.create(-100, 0), Vec2.create(100, 0)],
      50,
    );
    const bodyA = body(Vec2.create(0, -0.5), new CircleCollider(1));
    const bodyB = body(Vec2.zero, terrain);

    const manifold = detectCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.y).toBeCloseTo(1);
  });

  it('should dispatch terrain-circle collisions, flipping the normal', () => {
    const terrain = new TerrainCollider(
      [Vec2.create(-100, 0), Vec2.create(100, 0)],
      50,
    );
    const bodyA = body(Vec2.zero, terrain);
    const bodyB = body(Vec2.create(0, -0.5), new CircleCollider(1));

    const manifold = detectCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.y).toBeCloseTo(-1);
  });

  it('should dispatch polygon-terrain collisions', () => {
    const terrain = new TerrainCollider(
      [Vec2.create(-100, 0), Vec2.create(100, 0)],
      50,
    );
    const bodyA = body(Vec2.create(0, -0.5), rectangle(2, 2));
    const bodyB = body(Vec2.zero, terrain);

    const manifold = detectCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.y).toBeCloseTo(1);
  });

  it('should dispatch terrain-polygon collisions, flipping the normal', () => {
    const terrain = new TerrainCollider(
      [Vec2.create(-100, 0), Vec2.create(100, 0)],
      50,
    );
    const bodyA = body(Vec2.zero, terrain);
    const bodyB = body(Vec2.create(0, -0.5), rectangle(2, 2));

    const manifold = detectCollision(bodyA, bodyB);

    expect(manifold).not.toBeNull();
    expect(manifold?.normal.y).toBeCloseTo(-1);
  });

  it('should throw an error for an unregistered collider pair', () => {
    const bodyA = body(Vec2.create(0, 0), new CircleCollider(1));
    const fakeBody = {
      position: Vec2.zero,
      rotation: 0,
      collider: { type: 'unknown' } as unknown as Collider,
    };

    expect(() => detectCollision(bodyA, fakeBody)).toThrow();
  });
});
