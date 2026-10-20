import { describe, expect, it } from 'vitest';
import { emptyTile, packTile, unpackTile } from './packed-tile.js';

const orientations = [false, true].flatMap((transpose) =>
  [false, true].flatMap((flipX) =>
    [false, true].map((flipY) => ({ flipX, flipY, transpose })),
  ),
);

describe('packTile and unpackTile', () => {
  it.each(orientations)(
    'round-trip every field for flipX $flipX, flipY $flipY, transpose $transpose',
    (orientation) => {
      for (const [source, tile] of [
        [0, 0],
        [255, 1_048_575],
        [3, 17],
      ]) {
        const fields = { source, tile, ...orientation };

        expect(unpackTile(packTile(fields))).toEqual(fields);
      }
    },
  );

  it('gives all eight orientations of one tile different values', () => {
    const packed = new Set(
      orientations.map((orientation) =>
        packTile({ source: 1, tile: 2, ...orientation }),
      ),
    );

    expect(packed.size).toBe(8);
  });

  it('defaults the transform bits to false', () => {
    expect(unpackTile(packTile({ source: 2, tile: 5 }))).toEqual({
      source: 2,
      tile: 5,
      flipX: false,
      flipY: false,
      transpose: false,
    });
  });

  it('never packs to the empty tile', () => {
    expect(packTile({ source: 0, tile: 0 })).not.toBe(emptyTile);
  });

  it('packs a flipped tile to a positive number a Uint32Array stores as is', () => {
    const tile = packTile({ source: 1, tile: 9, flipX: true, flipY: true });
    const cells = new Uint32Array(1);

    cells[0] = tile;

    expect(tile).toBeGreaterThan(0);
    expect(cells[0]).toBe(tile);
  });

  it('puts the transform bits where Tiled puts its flip flags', () => {
    expect(packTile({ source: 0, tile: 0, flipX: true }) >>> 31).toBe(1);
    expect((packTile({ source: 0, tile: 0, flipY: true }) >>> 30) & 1).toBe(1);
    expect((packTile({ source: 0, tile: 0, transpose: true }) >>> 29) & 1).toBe(
      1,
    );
  });

  it.each([-1, 256, 1.5, Number.NaN])(
    'packTile throws for source %s',
    (source) => {
      expect(() => packTile({ source, tile: 0 })).toThrow(/source/);
    },
  );

  it.each([-1, 1_048_576, 0.5])('packTile throws for tile %s', (tile) => {
    expect(() => packTile({ source: 0, tile })).toThrow(/tile index/);
  });

  it('unpackTile throws for the empty tile', () => {
    expect(() => unpackTile(emptyTile)).toThrow(/empty tile/);
  });

  it.each([-1, 0.5, 2 ** 32, Number.NaN])(
    'unpackTile throws for %s, which is not a uint32',
    (tile) => {
      expect(() => unpackTile(tile)).toThrow(/isn't a packed tile/);
    },
  );

  it('unpackTile throws for a value whose bit 28 is clear', () => {
    expect(() => unpackTile(5)).toThrow(/bit 28/);
  });
});
