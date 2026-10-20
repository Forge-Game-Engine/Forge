import { describe, expect, it } from 'vitest';
import {
  createIsometricGridLayout,
  createOrthogonalGridLayout,
} from '../../math/index.js';
import { createGridTextureAtlas } from '../../rendering/texture-atlas/index.js';
import {
  createTestSource,
  createTestTileSet,
  textureOfSize,
} from '../test-helpers/create-test-tile-set.js';
import { emptyTile, packTile } from '../tiles/packed-tile.js';
import { createTileSet, getTileData } from './tile-set.js';

const layout = createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 8 });

describe('createTileSet', () => {
  it('defaults each source to the layout cell size', () => {
    const tileSet = createTileSet({
      layout,
      sources: [createTestSource(2, 2)],
    });

    expect(tileSet.sources[0].tileWidth).toBe(16);
    expect(tileSet.sources[0].tileHeight).toBe(8);
  });

  it('keeps a source tile size of its own', () => {
    const tileSet = createTileSet({
      layout: createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
      sources: [createTestSource(1, 1, { tileWidth: 64, tileHeight: 96 })],
    });

    expect(tileSet.sources[0].tileWidth).toBe(64);
    expect(tileSet.sources[0].tileHeight).toBe(96);
  });

  it('gives every atlas region a tile with the default data', () => {
    const tileSet = createTileSet({
      layout,
      sources: [createTestSource(3, 2)],
    });
    const { tiles } = tileSet.sources[0];

    expect(tiles).toHaveLength(6);

    for (const tile of tiles) {
      expect(tile).toEqual({
        properties: {},
        textureOrigin: { x: 0, y: 0 },
        ySortOrigin: 0,
      });
    }
  });

  it('puts tile data on the tile index it is keyed by and shares the default', () => {
    const tileSet = createTileSet({
      layout,
      sources: [
        createTestSource(2, 2, {
          tiles: new Map([
            [
              3,
              {
                properties: { door: true, cost: 2, sound: 'creak' },
                textureOrigin: { x: 0, y: -4 },
                ySortOrigin: 3,
              },
            ],
          ]),
        }),
      ],
    });
    const { tiles } = tileSet.sources[0];

    expect(tiles[3]).toEqual({
      properties: { door: true, cost: 2, sound: 'creak' },
      textureOrigin: { x: 0, y: -4 },
      ySortOrigin: 3,
    });
    expect(tiles[0]).toBe(tiles[1]);
    expect(tiles[0].properties).toEqual({});
  });

  it('copies tile data, so changing the options later does nothing', () => {
    const properties: Record<string, string> = { kind: 'grass' };
    const textureOrigin = { x: 0, y: -2 };
    const tileSet = createTileSet({
      layout,
      sources: [
        createTestSource(1, 1, {
          tiles: new Map([[0, { properties, textureOrigin }]]),
        }),
      ],
    });

    properties.kind = 'sand';
    textureOrigin.y = 5;

    expect(tileSet.sources[0].tiles[0].properties.kind).toBe('grass');
    expect(tileSet.sources[0].tiles[0].textureOrigin.y).toBe(-2);
  });

  it('freezes the tile set, its sources and their tile data', () => {
    const tileSet = createTestTileSet();
    const source = tileSet.sources[0];

    expect(Object.isFrozen(tileSet)).toBe(true);
    expect(Object.isFrozen(tileSet.sources)).toBe(true);
    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.isFrozen(source.tiles)).toBe(true);
    expect(Object.isFrozen(source.tiles[0])).toBe(true);
    expect(Object.isFrozen(source.tiles[0].properties)).toBe(true);
    expect(Object.isFrozen(source.tiles[0].textureOrigin)).toBe(true);
  });

  it('throws for no sources', () => {
    expect(() => createTileSet({ layout, sources: [] })).toThrow(
      /at least one source/,
    );
  });

  it('throws for more than 256 sources', () => {
    const sources = Array.from({ length: 257 }, () => createTestSource(1, 1));

    expect(() => createTileSet({ layout, sources })).toThrow(/at most 256/);
  });

  it.each([0, -1, Number.NaN, Infinity])(
    'throws for a tileWidth or tileHeight of %s',
    (size) => {
      expect(() =>
        createTileSet({
          layout,
          sources: [createTestSource(1, 1, { tileWidth: size })],
        }),
      ).toThrow(/source 0 has a tileWidth/);
      expect(() =>
        createTileSet({
          layout,
          sources: [createTestSource(1, 1, { tileHeight: size })],
        }),
      ).toThrow(/source 0 has a tileHeight/);
    },
  );

  it.each([-1, 4, 1.5])('throws for data keyed by tile %s', (tile) => {
    expect(() =>
      createTileSet({
        layout,
        sources: [createTestSource(2, 2, { tiles: new Map([[tile, {}]]) })],
      }),
    ).toThrow(/has data for tile/);
  });

  it('throws for a textureOrigin or ySortOrigin that is not finite', () => {
    expect(() =>
      createTileSet({
        layout,
        sources: [
          createTestSource(1, 1, {
            tiles: new Map([[0, { textureOrigin: { x: Number.NaN, y: 0 } }]]),
          }),
        ],
      }),
    ).toThrow(/textureOrigin/);
    expect(() =>
      createTileSet({
        layout,
        sources: [
          createTestSource(1, 1, {
            tiles: new Map([[0, { ySortOrigin: Infinity }]]),
          }),
        ],
      }),
    ).toThrow(/ySortOrigin/);
  });

  it('throws for an atlas with more than 1,048,576 regions', () => {
    const atlas = createGridTextureAtlas(textureOfSize(1025, 1024), {
      cellWidth: 1,
      cellHeight: 1,
    });

    expect(() => createTileSet({ layout, sources: [{ atlas }] })).toThrow(
      /at most 1048576 tiles/,
    );
  });
});

describe('getTileData', () => {
  it('returns the data of a tile in any source', () => {
    const tileSet = createTileSet({
      layout,
      sources: [
        createTestSource(1, 1),
        createTestSource(2, 1, {
          tiles: new Map([[1, { properties: { water: true } }]]),
        }),
      ],
    });

    expect(
      getTileData(tileSet, packTile({ source: 1, tile: 1, flipX: true })),
    ).toBe(tileSet.sources[1].tiles[1]);
  });

  it('throws for the empty tile', () => {
    expect(() => getTileData(createTestTileSet(), emptyTile)).toThrow(
      /empty tile/,
    );
  });

  it('throws for a source or tile the tile set does not have', () => {
    const tileSet = createTestTileSet();

    expect(() =>
      getTileData(tileSet, packTile({ source: 2, tile: 0 })),
    ).toThrow("its source 2 doesn't exist, the tile set has 2 sources.");
    expect(() =>
      getTileData(tileSet, packTile({ source: 1, tile: 2 })),
    ).toThrow(
      "its tile 2 doesn't exist, source 1 of the tile set has 2 tiles.",
    );
  });

  it('throws for a malformed tile', () => {
    expect(() => getTileData(createTestTileSet(), 7)).toThrow(/bit 28/);
  });
});
