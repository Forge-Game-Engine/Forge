import { describe, expect, it } from 'vitest';
import {
  createIsometricGridLayout,
  createOrthogonalGridLayout,
} from '../../math/index.js';
import { createTestSource } from '../test-helpers/create-test-tile-set.js';
import { createTileSet } from '../tile-set/tile-set.js';
import { getTileImageRect } from './get-tile-image-rect.js';
import { packTile } from './packed-tile.js';

describe('getTileImageRect', () => {
  it('covers an orthogonal cell exactly for a cell-sized tile', () => {
    const tileSet = createTileSet({
      layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 8 }),
      sources: [createTestSource(1, 1)],
    });

    expect(
      getTileImageRect(tileSet, 2, -1, packTile({ source: 0, tile: 0 })),
    ).toEqual({ min: { x: 32, y: -8 }, max: { x: 48, y: 0 } });
  });

  it('covers an isometric cell footprint bounds for a cell-sized tile', () => {
    const layout = createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 });
    const tileSet = createTileSet({
      layout,
      sources: [createTestSource(1, 1)],
    });

    expect(
      getTileImageRect(tileSet, 1, 0, packTile({ source: 0, tile: 0 })),
    ).toEqual(layout.getCellFootprintBounds(1, 0));
  });

  it('reaches up from the footprint for a tile taller than its cell', () => {
    const tileSet = createTileSet({
      layout: createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
      sources: [createTestSource(1, 1, { tileHeight: 96 })],
    });

    // Cell (0, 0)'s diamond spans x -32 to 32 and y 0 to 32.
    expect(
      getTileImageRect(tileSet, 0, 0, packTile({ source: 0, tile: 0 })),
    ).toEqual({ min: { x: -32, y: -64 }, max: { x: 32, y: 32 } });
  });

  it('moves the image by the tile textureOrigin, Y-down', () => {
    const tileSet = createTileSet({
      layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
      sources: [
        createTestSource(2, 1, {
          tileWidth: 32,
          tileHeight: 24,
          tiles: new Map([[1, { textureOrigin: { x: -8, y: 4 } }]]),
        }),
      ],
    });

    expect(
      getTileImageRect(tileSet, 0, 0, packTile({ source: 0, tile: 0 })),
    ).toEqual({ min: { x: 0, y: -8 }, max: { x: 32, y: 16 } });
    expect(
      getTileImageRect(tileSet, 0, 0, packTile({ source: 0, tile: 1 })),
    ).toEqual({ min: { x: -8, y: -4 }, max: { x: 24, y: 20 } });
  });

  it('keeps the rect of a square tile for every transform', () => {
    const tileSet = createTileSet({
      layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
      sources: [createTestSource(1, 1)],
    });

    expect(
      getTileImageRect(
        tileSet,
        0,
        0,
        packTile({ source: 0, tile: 0, transpose: true, flipX: true }),
      ),
    ).toEqual(
      getTileImageRect(tileSet, 0, 0, packTile({ source: 0, tile: 0 })),
    );
  });

  describe.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])('for a 16 x 32 tile with flipX %s and flipY %s', (flipX, flipY) => {
    const tileSet = createTileSet({
      layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
      sources: [
        createTestSource(1, 1, {
          tileHeight: 32,
          tiles: new Map([[0, { textureOrigin: { x: 2, y: -1 } }]]),
        }),
      ],
    });

    it('keeps the rect without transpose', () => {
      expect(
        getTileImageRect(
          tileSet,
          1,
          1,
          packTile({ source: 0, tile: 0, flipX, flipY }),
        ),
      ).toEqual({ min: { x: 18, y: -1 }, max: { x: 34, y: 31 } });
    });

    it('swaps the width and height with transpose, keeping the bottom-left corner', () => {
      expect(
        getTileImageRect(
          tileSet,
          1,
          1,
          packTile({ source: 0, tile: 0, flipX, flipY, transpose: true }),
        ),
      ).toEqual({ min: { x: 18, y: 15 }, max: { x: 50, y: 31 } });
    });
  });

  it('gives a cell-sized tile exactly the edges its neighbors start at', () => {
    const tileSet = createTileSet({
      layout: createOrthogonalGridLayout({ cellWidth: 0.1, cellHeight: 0.3 }),
      sources: [createTestSource(1, 1)],
    });
    const tile = packTile({ source: 0, tile: 0 });

    for (let column = -3; column < 40; column++) {
      const rect = getTileImageRect(tileSet, column, 7, tile);

      expect(getTileImageRect(tileSet, column + 1, 7, tile).min.x).toBe(
        rect.max.x,
      );
      expect(getTileImageRect(tileSet, column, 8, tile).min.y).toBe(rect.max.y);
    }
  });

  it('throws for a tile the tile set does not have', () => {
    const tileSet = createTileSet({
      layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
      sources: [createTestSource(1, 1)],
    });

    expect(() =>
      getTileImageRect(tileSet, 0, 0, packTile({ source: 0, tile: 1 })),
    ).toThrow(/tile 1 doesn't exist/);
  });

  it('throws for a cell outside the supported range', () => {
    const tileSet = createTileSet({
      layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
      sources: [createTestSource(1, 1)],
    });
    const tile = packTile({ source: 0, tile: 0 });

    expect(() => getTileImageRect(tileSet, 0.5, 0, tile)).toThrow(
      /must be whole numbers/,
    );
    expect(() => getTileImageRect(tileSet, 0, 2 ** 30, tile)).toThrow(
      /must be whole numbers/,
    );
  });
});
