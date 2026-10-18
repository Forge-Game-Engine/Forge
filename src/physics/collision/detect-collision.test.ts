import { describe, expect, it } from 'vitest';
import { detectCollision } from './detect-collision.js';
import { ChainCollider } from '../colliders/chain-collider.js';
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
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ]);
}

function body(position: Vector2, collider: Collider): CollisionBody {
  return { position, rotation: 0, collider };
}

/**
 * Solid below `y = 0` from `x = -100` to `100`.
 */
function chainFloor(): ChainCollider {
  return new ChainCollider([
    [
      { x: -100, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: -100, y: 50 },
    ],
  ]);
}

describe('detectCollision', () => {
  it('should return no manifolds when the bodies do not overlap', () => {
    const bodyA = body({ x: 0, y: 0 }, new CircleCollider(1));
    const bodyB = body({ x: 50, y: 0 }, new CircleCollider(1));

    expect(detectCollision(bodyA, bodyB)).toEqual([]);
  });

  it('should dispatch circle-circle collisions', () => {
    const bodyA = body({ x: 0, y: 0 }, new CircleCollider(1));
    const bodyB = body({ x: 1.5, y: 0 }, new CircleCollider(1));

    expect(detectCollision(bodyA, bodyB)).toHaveLength(1);
  });

  it('should dispatch circle-polygon collisions', () => {
    const bodyA = body({ x: 0, y: -1.5 }, new CircleCollider(1));
    const bodyB = body({ x: 0, y: 0 }, rectangle(2, 2));

    const [manifold] = detectCollision(bodyA, bodyB);

    expect(manifold).toBeDefined();
    expect(manifold.normal.x).toBeCloseTo(0);
    expect(manifold.normal.y).toBeCloseTo(1);
  });

  it('should dispatch polygon-circle collisions, flipping the normal', () => {
    const bodyA = body({ x: 0, y: 0 }, rectangle(2, 2));
    const bodyB = body({ x: 0, y: -1.5 }, new CircleCollider(1));

    const [manifold] = detectCollision(bodyA, bodyB);

    expect(manifold).toBeDefined();
    expect(manifold.normal.x).toBeCloseTo(0);
    expect(manifold.normal.y).toBeCloseTo(-1);
    expect(manifold.depth).toBeCloseTo(0.5);
  });

  it('should dispatch polygon-polygon collisions', () => {
    const bodyA = body({ x: 0, y: 0 }, rectangle(2, 2));
    const bodyB = body({ x: 1.5, y: 0 }, rectangle(2, 2));

    const [manifold] = detectCollision(bodyA, bodyB);

    expect(manifold).toBeDefined();
    expect(manifold.normal.x).toBeCloseTo(1);
    expect(manifold.normal.y).toBeCloseTo(0);
  });

  it('should dispatch circle-terrain collisions', () => {
    const terrain = new TerrainCollider(
      [
        { x: -100, y: 0 },
        { x: 100, y: 0 },
      ],
      50,
    );
    const bodyA = body({ x: 0, y: -0.5 }, new CircleCollider(1));
    const bodyB = body(Vec2.zero, terrain);

    const [manifold] = detectCollision(bodyA, bodyB);

    expect(manifold).toBeDefined();
    expect(manifold.normal.y).toBeCloseTo(1);
  });

  it('should dispatch terrain-circle collisions, flipping the normal', () => {
    const terrain = new TerrainCollider(
      [
        { x: -100, y: 0 },
        { x: 100, y: 0 },
      ],
      50,
    );
    const bodyA = body(Vec2.zero, terrain);
    const bodyB = body({ x: 0, y: -0.5 }, new CircleCollider(1));

    const [manifold] = detectCollision(bodyA, bodyB);

    expect(manifold).toBeDefined();
    expect(manifold.normal.y).toBeCloseTo(-1);
  });

  it('should dispatch polygon-terrain collisions', () => {
    const terrain = new TerrainCollider(
      [
        { x: -100, y: 0 },
        { x: 100, y: 0 },
      ],
      50,
    );
    const bodyA = body({ x: 0, y: -0.5 }, rectangle(2, 2));
    const bodyB = body(Vec2.zero, terrain);

    const [manifold] = detectCollision(bodyA, bodyB);

    expect(manifold).toBeDefined();
    expect(manifold.normal.y).toBeCloseTo(1);
  });

  it('should dispatch terrain-polygon collisions, flipping the normal', () => {
    const terrain = new TerrainCollider(
      [
        { x: -100, y: 0 },
        { x: 100, y: 0 },
      ],
      50,
    );
    const bodyA = body(Vec2.zero, terrain);
    const bodyB = body({ x: 0, y: -0.5 }, rectangle(2, 2));

    const [manifold] = detectCollision(bodyA, bodyB);

    expect(manifold).toBeDefined();
    expect(manifold.normal.y).toBeCloseTo(-1);
  });

  describe('chains', () => {
    const floor = chainFloor;

    it('should dispatch circle-chain collisions', () => {
      const [manifold] = detectCollision(
        body({ x: 0, y: -0.5 }, new CircleCollider(1)),
        body(Vec2.zero, floor()),
      );

      expect(manifold).toBeDefined();
      expect(manifold.normal.y).toBeCloseTo(1);
    });

    it('should dispatch chain-circle collisions, flipping the normal', () => {
      const [manifold] = detectCollision(
        body(Vec2.zero, floor()),
        body({ x: 0, y: -0.5 }, new CircleCollider(1)),
      );

      expect(manifold).toBeDefined();
      expect(manifold.normal.y).toBeCloseTo(-1);
    });

    it('should dispatch polygon-chain collisions', () => {
      const [manifold] = detectCollision(
        body({ x: 0, y: -0.5 }, rectangle(2, 2)),
        body(Vec2.zero, floor()),
      );

      expect(manifold).toBeDefined();
      expect(manifold.normal.y).toBeCloseTo(1);
    });

    it('should dispatch chain-polygon collisions, flipping the normal', () => {
      const [manifold] = detectCollision(
        body(Vec2.zero, floor()),
        body({ x: 0, y: -0.5 }, rectangle(2, 2)),
      );

      expect(manifold).toBeDefined();
      expect(manifold.normal.y).toBeCloseTo(-1);
    });
  });

  describe('pairs of shapes that cannot be dynamic', () => {
    const terrain = (): TerrainCollider =>
      new TerrainCollider(
        [
          { x: -100, y: 0 },
          { x: 100, y: 0 },
        ],
        50,
      );
    it.each([
      ['terrain-terrain', terrain, terrain],
      ['chain-chain', chainFloor, chainFloor],
      ['chain-terrain', chainFloor, terrain],
      ['terrain-chain', terrain, chainFloor],
    ])(
      'should return no manifolds for overlapping %s pairs',
      (_name, createA, createB) => {
        const bodyA = body(Vec2.zero, createA());
        const bodyB = body({ x: 10, y: 10 }, createB());

        expect(detectCollision(bodyA, bodyB)).toEqual([]);
      },
    );
  });
});
