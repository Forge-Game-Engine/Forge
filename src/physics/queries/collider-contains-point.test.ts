import { describe, expect, it } from 'vitest';
import { Vector2 } from '../../math/index.js';
import { ChainCollider } from '../colliders/chain-collider.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { Collider } from '../colliders/collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { colliderContainsPoint } from './collider-contains-point.js';

const at = (collider: Collider) => ({
  position: { x: 0, y: 0 },
  rotation: 0,
  collider,
});

describe('colliderContainsPoint', () => {
  it.each<[string, Collider, Vector2, Vector2]>([
    ['circle', new CircleCollider(1), { x: 0.5, y: 0 }, { x: 1.5, y: 0 }],
    [
      'polygon',
      new PolygonCollider([
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
      ]),
      { x: 0.5, y: 0.5 },
      { x: 1.5, y: 0.5 },
    ],
    [
      'terrain',
      new TerrainCollider(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        2,
      ),
      { x: 5, y: 1 },
      { x: 5, y: -1 },
    ],
    [
      'chain',
      new ChainCollider([
        [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 2, y: 2 },
          { x: 0, y: 2 },
        ],
      ]),
      { x: 1, y: 1 },
      { x: 3, y: 1 },
    ],
  ])('tests a %s collider', (_type, collider, inside, outside) => {
    expect(colliderContainsPoint(at(collider), inside)).toBe(true);
    expect(colliderContainsPoint(at(collider), outside)).toBe(false);
  });

  it('throws, naming the type, for a collider type it has no test for', () => {
    // A `Collider` subclass from outside the engine can carry a type
    // `ColliderType` doesn't list.
    const collider = new CircleCollider(1);

    Object.defineProperty(collider, 'type', { value: 'capsule' });

    expect(() => colliderContainsPoint(at(collider), { x: 0, y: 0 })).toThrow(
      '"capsule"',
    );
  });
});
