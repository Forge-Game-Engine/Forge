import { describe, expect, it } from 'vitest';
import { ChainCollider } from '../../../physics/colliders/chain-collider.js';
import { CircleCollider } from '../../../physics/colliders/circle-collider.js';
import { PolygonCollider } from '../../../physics/colliders/polygon-collider.js';
import { calculateSignedArea } from '../../../physics/colliders/polygon-math.js';
import { TerrainCollider } from '../../../physics/colliders/terrain-collider.js';
import { getColliderRegion } from './collider-regions.js';
import { BakeRegion, LoopsRegion } from './mark-region.js';

const square = (size: number, isHole = false): { x: number; y: number }[] => {
  const loop = [
    { x: -size, y: -size },
    { x: size, y: -size },
    { x: size, y: size },
    { x: -size, y: size },
  ];

  return isHole ? loop.reverse() : loop;
};

const asLoops = (region: BakeRegion): LoopsRegion => {
  if (region.kind !== 'loops') {
    throw new Error('Expected a loops region.');
  }

  return region;
};

describe('getColliderRegion', () => {
  it("places a circle's turned centre", () => {
    const region = getColliderRegion({
      position: { x: 10, y: 20 },
      rotation: Math.PI / 2,
      collider: new CircleCollider(3, 1, { x: 5, y: 0 }),
    });

    if (region.kind !== 'disc') {
      throw new Error('Expected a disc region.');
    }

    expect(region.center.x).toBeCloseTo(10);
    expect(region.center.y).toBeCloseTo(25);
    expect(region.radius).toBe(3);
  });

  it("places a polygon's vertices, wound around solid", () => {
    const region = asLoops(
      getColliderRegion({
        position: { x: 100, y: 0 },
        rotation: 0,
        collider: new PolygonCollider(square(4, true)),
      }),
    );

    expect(region.outsideIsSolid).toBe(false);
    expect(region.loops).toHaveLength(1);
    expect(calculateSignedArea(region.loops[0])).toBeGreaterThan(0);
    expect(region.loops[0][0]).toEqual({ x: 96, y: -4 });
  });

  it("closes a terrain's surface into its slab", () => {
    const region = asLoops(
      getColliderRegion({
        position: { x: 0, y: 10 },
        rotation: 0,
        collider: new TerrainCollider(
          [
            { x: 0, y: 5 },
            { x: 10, y: 0 },
            { x: 20, y: 5 },
          ],
          4,
        ),
      }),
    );

    expect(region.outsideIsSolid).toBe(false);
    expect(region.loops[0]).toEqual([
      { x: 0, y: 15 },
      { x: 10, y: 10 },
      { x: 20, y: 15 },
      { x: 20, y: 19 },
      { x: 0, y: 19 },
    ]);
    expect(calculateSignedArea(region.loops[0])).toBeGreaterThan(0);
  });

  it("keeps a chain's loops and their winding", () => {
    const region = asLoops(
      getColliderRegion({
        position: { x: 0, y: 0 },
        rotation: 0.3,
        collider: new ChainCollider([square(10), square(5, true)]),
      }),
    );

    expect(region.outsideIsSolid).toBe(false);
    expect(region.loops).toHaveLength(2);
    expect(calculateSignedArea(region.loops[0])).toBeGreaterThan(0);
    expect(calculateSignedArea(region.loops[1])).toBeLessThan(0);
  });

  it('makes the outside solid when the largest loop is a hole', () => {
    const lone = asLoops(
      getColliderRegion({
        position: { x: 0, y: 0 },
        rotation: 0,
        collider: new ChainCollider([square(5, true)]),
      }),
    );
    const contradictory = asLoops(
      getColliderRegion({
        position: { x: 0, y: 0 },
        rotation: 0,
        collider: new ChainCollider([
          square(2).map((point) => ({ x: point.x + 50, y: point.y })),
          square(5, true),
        ]),
      }),
    );

    expect(lone.outsideIsSolid).toBe(true);
    expect(contradictory.outsideIsSolid).toBe(true);
  });

  it('gives a chain with no loops an empty region', () => {
    const region = asLoops(
      getColliderRegion({
        position: { x: 0, y: 0 },
        rotation: 0,
        collider: new ChainCollider([]),
      }),
    );

    expect(region.loops).toEqual([]);
    expect(region.outsideIsSolid).toBe(false);
  });
});
