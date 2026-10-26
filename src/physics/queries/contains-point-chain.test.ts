import { describe, expect, it } from 'vitest';
import { Vector2 } from '../../math/index.js';
import { ChainCollider } from '../colliders/chain-collider.js';
import { containsPointChain } from './contains-point-chain.js';

/** A square loop from `min` to `max` on both axes. */
const square = (min: number, max: number, isHole = false): Vector2[] => {
  const loop = [
    { x: min, y: min },
    { x: max, y: min },
    { x: max, y: max },
    { x: min, y: max },
  ];

  return isHole ? loop.reverse() : loop;
};

const at = (collider: ChainCollider, rotation = 0) => ({
  position: { x: 0, y: 0 },
  rotation,
  collider,
});

describe('containsPointChain', () => {
  // Solid from 0 to 10, with a room from 2 to 8 and an island from 4 to 6.
  const walls = new ChainCollider([
    square(0, 10),
    square(2, 8, true),
    square(4, 6),
  ]);

  it('contains a point inside a solid loop', () => {
    expect(containsPointChain(at(walls), { x: 1, y: 5 })).toBe(true);
  });

  it('does not contain a point in a hole inside a solid loop', () => {
    expect(containsPointChain(at(walls), { x: 3, y: 5 })).toBe(false);
  });

  it('contains a point on an island inside the hole', () => {
    expect(containsPointChain(at(walls), { x: 5, y: 5 })).toBe(true);
  });

  it('does not contain a point outside every loop', () => {
    expect(containsPointChain(at(walls), { x: -1, y: 5 })).toBe(false);
    expect(containsPointChain(at(walls), { x: 11, y: 5 })).toBe(false);
  });

  it('contains a point on an edge of each kind', () => {
    expect(containsPointChain(at(walls), { x: 0, y: 5 })).toBe(true);
    expect(containsPointChain(at(walls), { x: 8, y: 5 })).toBe(true);
    expect(containsPointChain(at(walls), { x: 5, y: 4 })).toBe(true);
  });

  it('counts a point level with a vertex once', () => {
    // The rays from these points towards -X pass through the room's
    // corners, where each of its side edges ends.
    expect(containsPointChain(at(walls), { x: 9, y: 2 })).toBe(true);
    expect(containsPointChain(at(walls), { x: 9, y: 8 })).toBe(true);
    // And through the outer loop's corner, on the line of its top edge.
    expect(containsPointChain(at(walls), { x: 11, y: 0 })).toBe(false);
    expect(containsPointChain(at(walls), { x: 11, y: 10 })).toBe(false);
  });

  it('treats a lone hole as a room in unbounded solid', () => {
    const room = new ChainCollider([square(2, 8, true)]);

    expect(containsPointChain(at(room), { x: 5, y: 5 })).toBe(false);
    expect(containsPointChain(at(room), { x: 2, y: 5 })).toBe(true);
    expect(containsPointChain(at(room), { x: 1, y: 5 })).toBe(true);
    expect(containsPointChain(at(room), { x: 100, y: -100 })).toBe(true);
  });

  it('contains nothing for a chain with no loops', () => {
    expect(containsPointChain(at(new ChainCollider([])), { x: 0, y: 0 })).toBe(
      false,
    );
  });

  it('decides the solid on a diagonal edge by winding', () => {
    const slope = new ChainCollider([
      [
        { x: 0, y: 10 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
    ]);

    expect(containsPointChain(at(slope), { x: 8, y: 5 })).toBe(true);
    expect(containsPointChain(at(slope), { x: 2, y: 5 })).toBe(false);
  });

  it('turns the chain with the entity', () => {
    const block = new ChainCollider([square(1, 3)]);

    expect(containsPointChain(at(block), { x: 2, y: 2 })).toBe(true);
    // A half turn moves the block to -3..-1 on both axes.
    expect(containsPointChain(at(block, Math.PI), { x: 2, y: 2 })).toBe(false);
    expect(containsPointChain(at(block, Math.PI), { x: -2, y: -2 })).toBe(true);
  });
});
