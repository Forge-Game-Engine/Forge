import { describe, expect, it } from 'vitest';
import { createOrthogonalGridLayout } from '../../math/index.js';
import { createTestSource } from '../test-helpers/create-test-tile-set.js';
import { createTileSet, TileAnimationFrame } from '../tile-set/tile-set.js';
import { emptyTile, packTile, unpackTile } from './packed-tile.js';
import {
  getDisplayedTile,
  getTileAnimationFrameIndex,
} from './tile-animation.js';
import { getNextFrameChangeTime } from './tile-animation-timing.js';

// 100 ms, then 50 ms, then 250 ms: 400 ms long.
const animation: readonly TileAnimationFrame[] = [
  { tile: 1, durationMilliseconds: 100 },
  { tile: 2, durationMilliseconds: 50 },
  { tile: 3, durationMilliseconds: 250 },
];

describe('getTileAnimationFrameIndex', () => {
  it.each([
    [0, 0],
    [99.9, 0],
    [100, 1],
    [149, 1],
    [150, 2],
    [399, 2],
  ])('shows, at %s ms, frame %s of frames with varying durations', (t, i) => {
    expect(getTileAnimationFrameIndex(animation, t)).toBe(i);
  });

  it('wraps at the animation’s length', () => {
    expect(getTileAnimationFrameIndex(animation, 400)).toBe(0);
    expect(getTileAnimationFrameIndex(animation, 520)).toBe(1);
  });

  it('lands on the right frame several cycles ahead, skipping frames', () => {
    expect(getTileAnimationFrameIndex(animation, 400 * 1000 + 120)).toBe(1);
    expect(getTileAnimationFrameIndex(animation, 400 * 37 + 399)).toBe(2);
  });

  it('continues the cycle backwards for negative times', () => {
    expect(getTileAnimationFrameIndex(animation, -1)).toBe(2);
    expect(getTileAnimationFrameIndex(animation, -260)).toBe(1);
    expect(getTileAnimationFrameIndex(animation, -400)).toBe(0);
  });

  it('always shows the only frame of a one-frame animation', () => {
    const single = [{ tile: 5, durationMilliseconds: 30 }];

    for (const t of [0, 29, 30, 1234.5, -7]) {
      expect(getTileAnimationFrameIndex(single, t)).toBe(0);
    }
  });

  it('shows the last frame when rounding leaves the time at the end of a cycle', () => {
    // 0.1 + 0.2 + 0.3 rounds to 0.6000000000000001. This time, just before
    // a cycle starts, wraps to a phase that's still at least 0.3 after the
    // first two durations are taken off it, so it's past every frame's start
    // but no frame's end.
    const rounding = [
      { tile: 1, durationMilliseconds: 0.1 },
      { tile: 2, durationMilliseconds: 0.2 },
      { tile: 3, durationMilliseconds: 0.3 },
    ];
    const t = -0.6000000000000002;

    expect(getTileAnimationFrameIndex(rounding, t)).toBe(2);
    expect(getNextFrameChangeTime(rounding, t)).toBeGreaterThanOrEqual(t);
  });

  it('throws for an empty animation and a time that is not finite', () => {
    expect(() => getTileAnimationFrameIndex([], 0)).toThrow(/no frames/);
    expect(() => getTileAnimationFrameIndex(animation, Number.NaN)).toThrow(
      /must be a finite number/,
    );
    expect(() => getTileAnimationFrameIndex(animation, Infinity)).toThrow(
      /must be a finite number/,
    );
  });
});

describe('getNextFrameChangeTime', () => {
  it.each([
    [0, 100],
    [50, 100],
    [100, 150],
    [149.5, 150],
    [150, 400],
    [399, 400],
    [400, 500],
    [4000 + 120, 4000 + 150],
    [-1, 0],
    [-300, -250],
  ])('changes frame after %s ms at %s ms', (t, next) => {
    expect(getNextFrameChangeTime(animation, t)).toBe(next);
    expect(getNextFrameChangeTime(animation, t)).toBeGreaterThan(t);
  });

  it('is not exported from the package', async () => {
    const tilemaps = await import('../index.js');

    expect(Object.keys(tilemaps)).not.toContain('getNextFrameChangeTime');
    expect(Object.keys(tilemaps)).toContain('getTileAnimationFrameIndex');
    expect(Object.keys(tilemaps)).toContain('getDisplayedTile');
  });
});

describe('getDisplayedTile', () => {
  const tileSet = createTileSet({
    layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
    sources: [
      createTestSource(1, 1),
      createTestSource(2, 2, { tiles: new Map([[0, { animation }]]) }),
    ],
  });

  it('returns a tile without animation as it is', () => {
    const tile = packTile({ source: 1, tile: 2, flipX: true });

    expect(getDisplayedTile(tileSet, tile, 120)).toBe(tile);
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    'returns the frame’s tile with the same source and transform bits %i',
    (bits) => {
      const transform = {
        flipX: (bits & 4) !== 0,
        flipY: (bits & 2) !== 0,
        transpose: (bits & 1) !== 0,
      };
      const placed = packTile({ source: 1, tile: 0, ...transform });

      expect(getDisplayedTile(tileSet, placed, 0)).toBe(
        packTile({ source: 1, tile: 1, ...transform }),
      );
      expect(unpackTile(getDisplayedTile(tileSet, placed, 160))).toEqual({
        source: 1,
        tile: 3,
        ...transform,
      });
    },
  );

  it('throws for the empty tile, an unknown tile and a time that is not finite', () => {
    const placed = packTile({ source: 1, tile: 0 });

    expect(() => getDisplayedTile(tileSet, emptyTile, 0)).toThrow(/empty tile/);
    expect(() =>
      getDisplayedTile(tileSet, packTile({ source: 2, tile: 0 }), 0),
    ).toThrow(/source 2 doesn't exist/);
    expect(() => getDisplayedTile(tileSet, placed, Number.NaN)).toThrow(
      /must be a finite number/,
    );
  });
});
