import { describe, expect, it } from 'vitest';
import { Vector2 } from '../../math/index.js';
import { ChainCollider } from '../colliders/chain-collider.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { findCircleChainSweepHits } from './circle-sweep-hits.js';
import { sweepCircleChain } from './sweep-circle-chain.js';

function chainBody(loops: Vector2[][]): CollisionBody {
  return {
    position: { x: 0, y: 0 },
    rotation: 0,
    collider: new ChainCollider(loops),
  };
}

const thinWall = [
  { x: 10, y: -5 },
  { x: 10.2, y: -5 },
  { x: 10.2, y: 5 },
  { x: 10, y: 5 },
];

const square = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

/**
 * A room: a hole from `x = -10` to `10` and `y = -10` to `0`.
 */
const room = [
  { x: -10, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: -10 },
  { x: -10, y: -10 },
];

describe('sweepCircleChain', () => {
  const circle = new CircleCollider(0.5);

  it('stops a fast circle at the near face of a thin wall', () => {
    const hit = sweepCircleChain(
      circle,
      chainBody([thinWall]),
      { x: 0, y: 0 },
      { x: 30, y: 0 },
    );

    expect(hit?.t).toBeCloseTo(9.5 / 30);
    expect(hit?.point.x).toBeCloseTo(10);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(-1);
    expect(hit?.normal.y).toBeCloseTo(0);
  });

  it('finds no hit for a circle leaving solid', () => {
    expect(
      sweepCircleChain(
        circle,
        chainBody([square]),
        { x: 5, y: 5 },
        { x: 25, y: 5 },
      ),
    ).toBeNull();
  });

  it('hits a convex corner on its round', () => {
    const hit = sweepCircleChain(
      circle,
      chainBody([square]),
      { x: 13, y: -3 },
      { x: 7, y: 3 },
    );

    expect(hit?.point.x).toBeCloseTo(10);
    expect(hit?.point.y).toBeCloseTo(0);
    expect(hit?.normal.x).toBeCloseTo(Math.SQRT1_2);
    expect(hit?.normal.y).toBeCloseTo(-Math.SQRT1_2);
  });

  it('finds only face hits in a concave corner', () => {
    const hits = findCircleChainSweepHits(
      circle,
      chainBody([room]),
      { x: 7, y: -3 },
      { x: 12, y: 2 },
    );

    expect(hits.length).toBeGreaterThan(0);

    for (const hit of hits) {
      expect(Math.abs(hit.normal.x * hit.normal.y)).toBeLessThan(1e-9);
    }
  });

  it('misses a chain the circle doesn’t reach', () => {
    expect(
      sweepCircleChain(
        circle,
        chainBody([thinWall]),
        { x: 0, y: 0 },
        { x: 9, y: 0 },
      ),
    ).toBeNull();
  });
});
