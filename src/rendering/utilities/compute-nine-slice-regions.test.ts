import { describe, expect, it } from 'vitest';

import { computeNineSliceRegions } from './compute-nine-slice-regions.js';

describe('computeNineSliceRegions', () => {
  const centerPivot = { x: 0.5, y: 0.5 };
  const fullUv = { offset: { x: 0, y: 0 }, scale: { x: 1, y: 1 } };

  it('degenerates to a single region matching a non-sliced sprite when there are no insets', () => {
    const regions = computeNineSliceRegions(
      100,
      50,
      centerPivot,
      fullUv.offset,
      fullUv.scale,
      { left: 0, right: 0, top: 0, bottom: 0 },
    );

    expect(regions).toHaveLength(1);
    expect(regions[0].offset).toEqual({ x: 0, y: 0 });
    expect(regions[0].size).toEqual({ x: 100, y: 50 });
    expect(regions[0].uvOffset).toEqual({ x: 0, y: 0 });
    expect(regions[0].uvScale).toEqual({ x: 1, y: 1 });
  });

  it('produces nine regions for a sprite with borders on every side', () => {
    const regions = computeNineSliceRegions(
      100,
      100,
      centerPivot,
      fullUv.offset,
      fullUv.scale,
      { left: 10, right: 10, top: 10, bottom: 10 },
    );

    expect(regions).toHaveLength(9);

    const totalArea = regions.reduce((sum, r) => sum + r.size.x * r.size.y, 0);

    expect(totalArea).toBeCloseTo(100 * 100, 5);
  });

  it('positions the four corners with fixed size regardless of overall size', () => {
    const regions = computeNineSliceRegions(
      200,
      120,
      centerPivot,
      fullUv.offset,
      fullUv.scale,
      { left: 8, right: 12, top: 4, bottom: 6 },
    );

    const topLeft = regions.find((r) => r.size.x === 8 && r.size.y === 4);
    const bottomRight = regions.find((r) => r.size.x === 12 && r.size.y === 6);

    expect(topLeft).toBeDefined();
    expect(bottomRight).toBeDefined();

    // Top-left corner center offset from the sprite's own center anchor.
    // Y is negated relative to X: sprite-space Y grows downward (top band
    // first), but world space is Y-up, so a top-left corner ends up with a
    // positive Y offset (up) alongside its negative X offset (left).
    expect(topLeft!.offset.x).toBeCloseTo(-200 / 2 + 8 / 2, 5);
    expect(topLeft!.offset.y).toBeCloseTo(120 / 2 - 4 / 2, 5);

    // Bottom-right corner center offset.
    expect(bottomRight!.offset.x).toBeCloseTo(200 / 2 - 12 / 2, 5);
    expect(bottomRight!.offset.y).toBeCloseTo(-120 / 2 + 6 / 2, 5);
  });

  // Pivot is Y-up (matching SpriteEcsComponent.pivot): (0, 0) is bottom-left
  // and (1, 1) is top-right. Each case anchors at one corner of the sprite,
  // so the near corner region's own center lands a half-region-size offset
  // away from the anchor, signed toward the sprite's interior.
  it.each([
    { pivot: { x: 0, y: 0 }, name: 'bottom-left', offset: { x: 5, y: 5 } },
    { pivot: { x: 1, y: 0 }, name: 'bottom-right', offset: { x: -5, y: 5 } },
    { pivot: { x: 0, y: 1 }, name: 'top-left', offset: { x: 5, y: -5 } },
    { pivot: { x: 1, y: 1 }, name: 'top-right', offset: { x: -5, y: -5 } },
  ])(
    'places the $name corner exactly at the anchor when the pivot is ($pivot.x, $pivot.y)',
    ({ pivot, offset }) => {
      const regions = computeNineSliceRegions(
        100,
        100,
        pivot,
        fullUv.offset,
        fullUv.scale,
        { left: 10, right: 10, top: 10, bottom: 10 },
      );

      const corner = regions.find(
        (r) =>
          r.size.x === 10 &&
          r.size.y === 10 &&
          r.offset.x === offset.x &&
          r.offset.y === offset.y,
      );

      expect(corner).toBeDefined();
    },
  );

  it('proportionally clamps insets that would otherwise overlap', () => {
    const regions = computeNineSliceRegions(
      10,
      10,
      centerPivot,
      fullUv.offset,
      fullUv.scale,
      { left: 8, right: 8, top: 0, bottom: 0 },
    );

    // left+right (16) exceeds width (10), so both are scaled down to 5 each,
    // leaving no room for a center band.
    expect(regions).toHaveLength(2);

    for (const region of regions) {
      expect(region.size.x).toBeCloseTo(5, 5);
    }
  });

  it('maps border insets to UV fractions using the native size, not the current size', () => {
    const regions = computeNineSliceRegions(
      200, // stretched to double the native width
      100,
      centerPivot,
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { left: 10, right: 10, top: 0, bottom: 0, nativeWidth: 100 },
    );

    const leftEdge = regions.find((r) => r.offset.x < 0 && r.size.x === 10);

    expect(leftEdge).toBeDefined();
    // 10 / 100 native width = 0.1 of the texture, unaffected by the resize.
    expect(leftEdge!.uvScale.x).toBeCloseTo(0.1, 5);
  });

  it('stretches the center region into a single segment by default', () => {
    const regions = computeNineSliceRegions(
      300,
      100,
      centerPivot,
      fullUv.offset,
      fullUv.scale,
      { left: 10, right: 10, top: 0, bottom: 0, nativeWidth: 100 },
    );

    const centerSegments = regions.filter(
      (r) => r.offset.x > -140 && r.offset.x < 140 && r.size.x > 20,
    );

    expect(centerSegments).toHaveLength(1);
    expect(centerSegments[0].size.x).toBeCloseTo(280, 5);
  });

  it('tiles the center region into evenly-sized repeats when centerMode is tile', () => {
    const regions = computeNineSliceRegions(
      300,
      100,
      centerPivot,
      fullUv.offset,
      fullUv.scale,
      {
        left: 10,
        right: 10,
        top: 0,
        bottom: 0,
        centerMode: 'tile',
        nativeWidth: 100,
      },
    );

    // Native center width is 100 - 10 - 10 = 80; current center width is
    // 300 - 10 - 10 = 280; round(280 / 80) = 4 tiles (would be 3.5 exactly,
    // but that rounds to 4 with banker's-unbiased Math.round semantics).
    const tiles = regions.filter((r) => Math.abs(r.size.x - 70) < 1e-5);

    expect(tiles).toHaveLength(4);

    for (const tile of tiles) {
      // Every tile samples the same center band texture rect: the full
      // sprite (1.0) minus the two 10/100-native-width border fractions.
      expect(tile.uvScale.x).toBeCloseTo(0.8, 5);
    }

    const totalTileWidth = tiles.reduce((sum, t) => sum + t.size.x, 0);
    expect(totalTileWidth).toBeCloseTo(280, 5);
  });

  it('tiles only the stretch axis of an edge region, leaving the border axis fixed', () => {
    const regions = computeNineSliceRegions(
      100,
      300,
      centerPivot,
      fullUv.offset,
      fullUv.scale,
      {
        left: 10,
        right: 10,
        top: 0,
        bottom: 0,
        edgeMode: 'tile',
        nativeWidth: 100,
        nativeHeight: 100,
      },
    );

    const leftEdgeTiles = regions.filter(
      (r) => r.size.x === 10 && r.offset.x < 0,
    );

    // Native height 100 tiling over a current height of 300 => 3 tiles.
    expect(leftEdgeTiles).toHaveLength(3);

    for (const tile of leftEdgeTiles) {
      expect(tile.size.y).toBeCloseTo(100, 5);
    }
  });
});
