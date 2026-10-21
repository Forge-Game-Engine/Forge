import { describe, expect, it } from 'vitest';
import { Vec2, Vector2 } from '../../math/index.js';
import { aabbsOverlap } from '../collision/aabb-overlap.js';
import { raycastChain } from '../raycast/raycast-chain.js';
import { ChainCollider } from './chain-collider.js';

const square: Vector2[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

describe('ChainCollider', () => {
  describe('constructor', () => {
    it('has type "chain" and doesn’t support dynamic bodies', () => {
      const collider = new ChainCollider([square]);

      expect(collider.type).toBe('chain');
      expect(collider.supportsDynamicBodies).toBe(false);
    });

    it('has zero mass data', () => {
      const collider = new ChainCollider([square]);

      expect(collider.mass).toBe(0);
      expect(collider.momentOfInertia).toBe(0);
      expect(collider.localCenterOfMass).toEqual({ x: 0, y: 0 });
    });

    it('clones its loops and builds their outline', () => {
      const loop = square.map((point) => Vec2.clone(point));
      const collider = new ChainCollider([loop]);

      loop[0].x = 100;

      expect(collider.loops[0][0]).toEqual({ x: 0, y: 0 });
      expect(collider.outline.edges).toHaveLength(4);
      expect(collider.outline.edges[0].start).toBe(collider.loops[0][0]);
    });

    it('accepts no loops and has no edges', () => {
      const collider = new ChainCollider([]);

      expect(collider.loops).toEqual([]);
      expect(collider.outline.edges).toHaveLength(0);
      expect(
        collider.outline.queryEdges({
          min: { x: -1e9, y: -1e9 },
          max: { x: 1e9, y: 1e9 },
        }),
      ).toEqual([]);
      expect(
        raycastChain(
          { position: { x: 0, y: 0 }, rotation: 0, collider },
          { x: -100, y: 0 },
          { x: 100, y: 0 },
        ),
      ).toBeNull();
    });

    it('throws for a loop with fewer than 3 points', () => {
      expect(
        () =>
          new ChainCollider([
            square,
            [
              { x: 20, y: 0 },
              { x: 30, y: 0 },
            ],
          ]),
      ).toThrow('loop 1 requires at least 3 points, received 2');
    });

    it('throws for consecutive duplicate points', () => {
      expect(
        () => new ChainCollider([[square[0], square[1], square[1], square[2]]]),
      ).toThrow('loop 0 has the same point at indices 1 and 2');
    });

    it('throws for a loop that repeats its first point at the end', () => {
      expect(() => new ChainCollider([[...square, square[0]]])).toThrow(
        "don't repeat the first point at the end",
      );
    });

    it('throws for a loop with zero area', () => {
      expect(
        () =>
          new ChainCollider([
            [
              { x: 0, y: 0 },
              { x: 10, y: 0 },
              { x: 20, y: 0 },
            ],
          ]),
      ).toThrow('loop 0 has zero area');
    });

    it('throws for edges that cross', () => {
      expect(
        () =>
          new ChainCollider([
            [
              { x: 0, y: 0 },
              { x: 10, y: 10 },
              { x: 10, y: 0 },
              { x: 0, y: 6 },
            ],
          ]),
      ).toThrow('cross or overlap');
    });

    it('throws for two loops that cross', () => {
      expect(
        () =>
          new ChainCollider([
            square,
            [
              { x: 5, y: 5 },
              { x: 15, y: 5 },
              { x: 15, y: 15 },
              { x: 5, y: 15 },
            ],
          ]),
      ).toThrow('cross or overlap');
    });

    it('throws for a vertex on another edge’s interior', () => {
      expect(
        () =>
          new ChainCollider([
            square,
            [
              { x: 10, y: 5 },
              { x: 20, y: 0 },
              { x: 20, y: 10 },
            ],
          ]),
      ).toThrow('cross or overlap');
    });

    it('throws for collinear overlapping edges', () => {
      expect(
        () =>
          new ChainCollider([
            square,
            [
              { x: 5, y: 10 },
              { x: 15, y: 10 },
              { x: 15, y: 20 },
            ],
          ]),
      ).toThrow('cross or overlap');
    });

    it('throws for an edge that turns straight back along the one before', () => {
      expect(
        () =>
          new ChainCollider([
            [
              { x: 0, y: 0 },
              { x: 10, y: 0 },
              { x: 5, y: 0 },
              { x: 5, y: 10 },
            ],
          ]),
      ).toThrow('cross or overlap');
    });

    it('accepts loops that touch at a shared vertex', () => {
      expect(
        () =>
          new ChainCollider([
            square,
            [
              { x: 10, y: 10 },
              { x: 20, y: 10 },
              { x: 20, y: 20 },
              { x: 10, y: 20 },
            ],
          ]),
      ).not.toThrow();
    });

    it('accepts a lone hole loop and a solid loop inside it', () => {
      const room = [...square].reverse();

      expect(
        () =>
          new ChainCollider([
            room,
            [
              { x: 2, y: 2 },
              { x: 4, y: 2 },
              { x: 4, y: 4 },
            ],
          ]),
      ).not.toThrow();
    });

    it('accepts collinear consecutive edges', () => {
      expect(
        () =>
          new ChainCollider([
            [
              { x: 0, y: 0 },
              { x: 5, y: 0 },
              { x: 10, y: 0 },
              { x: 10, y: 10 },
            ],
          ]),
      ).not.toThrow();
    });
  });

  describe('computeAabb', () => {
    it('bounds every loop exactly when unrotated', () => {
      const collider = new ChainCollider([
        square,
        [
          { x: 20, y: -5 },
          { x: 30, y: -5 },
          { x: 30, y: 5 },
        ],
      ]);

      expect(collider.computeAabb({ x: 100, y: 50 }, 0)).toEqual({
        min: { x: 100, y: 45 },
        max: { x: 130, y: 60 },
      });
    });

    it('encloses every point when rotated', () => {
      const collider = new ChainCollider([square]);
      const rotation = 0.6;
      const position = { x: 3, y: -4 };
      const aabb = collider.computeAabb(position, rotation);

      for (const point of square) {
        const world = Vec2.add(
          Vec2.rotate(Vec2.clone(point), rotation),
          position,
        );

        expect(world.x).toBeGreaterThanOrEqual(aabb.min.x - 1e-9);
        expect(world.x).toBeLessThanOrEqual(aabb.max.x + 1e-9);
        expect(world.y).toBeGreaterThanOrEqual(aabb.min.y - 1e-9);
        expect(world.y).toBeLessThanOrEqual(aabb.max.y + 1e-9);
      }
    });

    it.each([0, 0.6])(
      'is the empty box, overlapping nothing, with no loops at rotation %s',
      (rotation) => {
        const aabb = new ChainCollider([]).computeAabb(
          { x: 3, y: -4 },
          rotation,
        );

        expect(aabb).toEqual({
          min: { x: Infinity, y: Infinity },
          max: { x: -Infinity, y: -Infinity },
        });
        expect(
          aabbsOverlap(aabb, {
            min: { x: -1e9, y: -1e9 },
            max: { x: 1e9, y: 1e9 },
          }),
        ).toBe(false);
      },
    );
  });
});
