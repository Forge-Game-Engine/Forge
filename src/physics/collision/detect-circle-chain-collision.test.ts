import { describe, expect, it } from 'vitest';
import { Random, Vector2 } from '../../math/index.js';
import { ChainCollider } from '../colliders/chain-collider.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { detectCircleChainCollision } from './detect-circle-chain-collision.js';
import {
  findCircleEdgeContacts,
  isInFrontOfEdge,
  toCircleChainManifolds,
} from './edge-chain-contacts.js';

function body(
  position: Vector2,
  collider: CircleCollider | ChainCollider,
  rotation: number = 0,
): CollisionBody {
  return { position, rotation, collider };
}

/**
 * Solid below `y = 0` from `x = -10` to `10`, its top split into twenty
 * collinear edges a unit long.
 */
function splitFloor(): ChainCollider {
  const top: Vector2[] = [];

  for (let x = -10; x <= 10; x++) {
    top.push({ x, y: 0 });
  }

  return new ChainCollider([[...top, { x: 10, y: 5 }, { x: -10, y: 5 }]]);
}

/**
 * A solid square from `(0, 0)` to `(10, 10)`: edges 0 to 3 are its top,
 * right, bottom and left, and vertex 1 is its top-right corner.
 */
function platform(): ChainCollider {
  return new ChainCollider([
    [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
  ]);
}

/**
 * A room: a hole from `x = -10` to `10` and `y = -10` to `0`, in unbounded
 * solid. Edge 0 is its floor and edge 1 its right wall.
 */
function room(): ChainCollider {
  return new ChainCollider([
    [
      { x: -10, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: -10 },
      { x: -10, y: -10 },
    ],
  ]);
}

describe('detectCircleChainCollision', () => {
  it('finds a face contact', () => {
    const manifolds = detectCircleChainCollision(
      body({ x: 0.5, y: -0.9 }, new CircleCollider(1)),
      body({ x: 0, y: 0 }, splitFloor()),
    );

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].normal.x).toBeCloseTo(0);
    expect(manifolds[0].normal.y).toBeCloseTo(1);
    expect(manifolds[0].depth).toBeCloseTo(0.1);
    expect(manifolds[0].contactPoints[0].x).toBeCloseTo(0.5);
    expect(manifolds[0].contactPoints[0].y).toBeCloseTo(0);
  });

  it('finds one straight-up contact at every position along a floor split into many edges', () => {
    const floor = body({ x: 0, y: 0 }, splitFloor());

    for (let x = -5; x <= 5; x += 0.125) {
      const manifolds = detectCircleChainCollision(
        body({ x, y: -0.9 }, new CircleCollider(1)),
        floor,
      );

      expect(manifolds).toHaveLength(1);
      expect(Math.abs(manifolds[0].normal.x)).toBeLessThan(1e-9);
      expect(manifolds[0].normal.y).toBeCloseTo(1);
    }
  });

  it('finds a contact at a convex corner, with one feature id from either edge', () => {
    const manifolds = detectCircleChainCollision(
      body({ x: 10.5, y: -0.5 }, new CircleCollider(1)),
      body({ x: 0, y: 0 }, platform()),
    );

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].normal.x).toBeCloseTo(-Math.SQRT1_2);
    expect(manifolds[0].normal.y).toBeCloseTo(Math.SQRT1_2);
    // Four edges, then vertex 1.
    expect(manifolds[0].featureIds).toEqual([5]);
  });

  it('finds a contact from each wall of a concave corner', () => {
    const manifolds = detectCircleChainCollision(
      body({ x: 9.5, y: -0.5 }, new CircleCollider(1)),
      body({ x: 0, y: 0 }, room()),
    );

    expect(manifolds).toHaveLength(2);
    expect(manifolds[0].featureIds).toEqual([0]);
    expect(manifolds[0].normal.y).toBeCloseTo(1);
    expect(manifolds[1].featureIds).toEqual([1]);
    expect(manifolds[1].normal.x).toBeCloseTo(1);
  });

  it('collides with the walls of a hole it is inside', () => {
    const manifolds = detectCircleChainCollision(
      body({ x: 0, y: -9.5 }, new CircleCollider(1)),
      body({ x: 0, y: 0 }, room()),
    );

    expect(manifolds).toHaveLength(1);
    expect(manifolds[0].normal.x).toBeCloseTo(0);
    expect(manifolds[0].normal.y).toBeCloseTo(-1);
  });

  it('doesn’t push a circle whose center is behind the edge', () => {
    expect(
      detectCircleChainCollision(
        body({ x: 5, y: 0.5 }, new CircleCollider(1)),
        body({ x: 0, y: 0 }, platform()),
      ),
    ).toEqual([]);
  });

  it('returns the same manifolds as testing every edge', () => {
    const random = new Random('circle-chain-tree');
    const jagged: Vector2[] = [];

    for (let x = -20; x <= 20; x++) {
      jagged.push({ x, y: random.randomFloat(-0.5, 0.5) });
    }

    const chain = new ChainCollider([
      [...jagged, { x: 20, y: 10 }, { x: -20, y: 10 }],
    ]);
    const chainBody = body({ x: 0, y: 0 }, chain);
    const allEdges = chain.outline.edges.map((_edge, index) => index);
    let compared = 0;

    for (let i = 0; i < 100; i++) {
      const center = {
        x: random.randomFloat(-22, 22),
        y: random.randomFloat(-2, 1),
      };
      const radius = random.randomFloat(0.25, 2);
      const expected = toCircleChainManifolds(
        findCircleEdgeContacts(
          chain.outline,
          allEdges.filter((edgeIndex) =>
            isInFrontOfEdge(chain.outline, edgeIndex, center),
          ),
          center,
          radius,
        ),
        radius,
        chainBody,
      );

      const actual = detectCircleChainCollision(
        body(center, new CircleCollider(radius)),
        chainBody,
      );

      compared += actual.length;
      expect(actual).toEqual(expected);
    }

    expect(compared).toBeGreaterThan(20);
  });
});
