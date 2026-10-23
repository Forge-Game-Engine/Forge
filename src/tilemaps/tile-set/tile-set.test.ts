import { describe, expect, it } from 'vitest';
import {
  createIsometricGridLayout,
  createOrthogonalGridLayout,
  GridLayout,
  Vector2,
} from '../../math/index.js';
import { calculateSignedArea } from '../../physics/colliders/polygon-math.js';
import {
  type AtlasRegion,
  createGridTextureAtlas,
} from '../../rendering/texture-atlas/index.js';
import {
  createTestSource,
  createTestTileSet,
  textureOfSize,
} from '../test-helpers/create-test-tile-set.js';
import { emptyTile, packTile } from '../tiles/packed-tile.js';
import {
  createTileSet,
  getTileData,
  TileAnimationFrame,
  TileCollisionShape,
  TileSet,
} from './tile-set.js';

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
        collision: null,
        animation: null,
        navigationCost: null,
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
      collision: null,
      animation: null,
      navigationCost: null,
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
    // Only the number of regions matters, so the stand-in's list is sparse
    // rather than a million real regions.
    const atlas = {
      ...createGridTextureAtlas(textureOfSize(16, 16), {
        cellWidth: 16,
        cellHeight: 16,
      }),
      regions: new Array<AtlasRegion>(1_048_577),
    };

    expect(() => createTileSet({ layout, sources: [{ atlas }] })).toThrow(
      /at most 1048576 tiles/,
    );
  });
});

describe('createTileSet navigation costs', () => {
  const withNavigationCost = (navigationCost: number | null): TileSet =>
    createTileSet({
      layout,
      sources: [
        createTestSource(2, 1, {
          tiles: new Map([[1, { navigationCost }]]),
        }),
      ],
    });

  it('stores a cost as a 32-bit float', () => {
    expect(withNavigationCost(3).sources[0].tiles[1].navigationCost).toBe(3);
    expect(withNavigationCost(0.1).sources[0].tiles[1].navigationCost).toBe(
      Math.fround(0.1),
    );
  });

  it('keeps a null cost', () => {
    expect(
      withNavigationCost(null).sources[0].tiles[1].navigationCost,
    ).toBeNull();
  });

  it('gives a tile with other data a null cost', () => {
    const tileSet = createTileSet({
      layout,
      sources: [
        createTestSource(1, 1, {
          tiles: new Map([[0, { collision: 'cell' }]]),
        }),
      ],
    });

    expect(tileSet.sources[0].tiles[0].navigationCost).toBeNull();
  });

  // 1e-50 underflows to 0 and 1e39 overflows to Infinity as 32-bit floats.
  it.each([0, -1, Number.NaN, Infinity, 1e-50, 1e39])(
    'throws for a cost of %s, naming the tile and source',
    (cost) => {
      expect(() => withNavigationCost(cost)).toThrow(
        `tile 1 of source 0 has a navigationCost of ${cost}, which must be finite and more than 0 as a 32-bit float, or null`,
      );
    },
  );
});

describe('createTileSet animations', () => {
  const withAnimation = (
    animation: readonly TileAnimationFrame[],
    tile: number = 0,
  ): TileSet =>
    createTileSet({
      layout,
      sources: [
        createTestSource(1, 1),
        createTestSource(2, 2, { tiles: new Map([[tile, { animation }]]) }),
      ],
    });

  it('copies and freezes an animation and its frames', () => {
    const frames = [
      { tile: 0, durationMilliseconds: 100 },
      { tile: 3, durationMilliseconds: 50 },
    ];
    const { animation } = withAnimation(frames).sources[1].tiles[0];

    frames[0].durationMilliseconds = 1;

    expect(animation).toEqual([
      { tile: 0, durationMilliseconds: 100 },
      { tile: 3, durationMilliseconds: 50 },
    ]);
    expect(Object.isFrozen(animation)).toBe(true);
    expect(Object.isFrozen(animation?.[0])).toBe(true);
  });

  it('keeps an animation null when given null', () => {
    const tileSet = createTileSet({
      layout,
      sources: [
        createTestSource(1, 1, { tiles: new Map([[0, { animation: null }]]) }),
      ],
    });

    expect(tileSet.sources[0].tiles[0].animation).toBeNull();
  });

  it('accepts frames that show the tile itself, another animated tile, or one frame', () => {
    const tileSet = createTileSet({
      layout,
      sources: [
        createTestSource(2, 1, {
          tiles: new Map([
            [0, { animation: [{ tile: 1, durationMilliseconds: 10 }] }],
            [
              1,
              {
                animation: [
                  { tile: 1, durationMilliseconds: 10 },
                  { tile: 0, durationMilliseconds: 10 },
                ],
              },
            ],
          ]),
        }),
      ],
    });

    expect(tileSet.sources[0].tiles[0].animation).toHaveLength(1);
    expect(tileSet.sources[0].tiles[1].animation).toHaveLength(2);
  });

  it('throws for an empty animation, naming the tile and source', () => {
    expect(() => withAnimation([], 2)).toThrow(
      'Unable to create a tile set: tile 2 of source 1 has an empty animation.',
    );
  });

  it.each([-1, 4, 1.5, Number.NaN])(
    'throws for a frame showing tile %s, naming the frame',
    (tile) => {
      expect(() =>
        withAnimation([
          { tile: 0, durationMilliseconds: 10 },
          { tile, durationMilliseconds: 10 },
        ]),
      ).toThrow(
        `tile 0 of source 1 has an animation whose frame 1 shows tile ${tile}, but its source has 4 tiles, so its tile indices are whole numbers from 0 to 3.`,
      );
    },
  );

  it('says "1 tile" for a frame outside a source with one tile', () => {
    expect(() =>
      createTileSet({
        layout,
        sources: [
          createTestSource(1, 1, {
            tiles: new Map([
              [0, { animation: [{ tile: 1, durationMilliseconds: 10 }] }],
            ]),
          }),
        ],
      }),
    ).toThrow(
      'tile 0 of source 0 has an animation whose frame 0 shows tile 1, but its source has 1 tile, so its tile indices are whole numbers from 0 to 0.',
    );
  });

  it.each([0, -5, Number.NaN, Infinity])(
    'throws for a frame lasting %s ms',
    (durationMilliseconds) => {
      expect(() => withAnimation([{ tile: 0, durationMilliseconds }])).toThrow(
        `tile 0 of source 1 has an animation whose frame 0 lasts ${durationMilliseconds} ms, which must be a positive finite number.`,
      );
    },
  );
});

describe('createTileSet collision shapes', () => {
  const square = createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 });
  const diamond = createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 });

  /** One step of the collision grid, in tile-local units of a 16-unit cell. */
  const step = 16 / 65_536;

  const createWithCollision = (
    collision: TileCollisionShape,
    tileLayout: GridLayout = square,
  ): TileSet =>
    createTileSet({
      layout: tileLayout,
      sources: [
        createTestSource(1, 1, { tiles: new Map([[0, { collision }]]) }),
      ],
    });

  it('keeps a cell shape', () => {
    expect(createWithCollision('cell').sources[0].tiles[0].collision).toBe(
      'cell',
    );
  });

  it('copies and freezes a polygon, keeping a positive winding', () => {
    const triangle = [
      { x: -8, y: 8 },
      { x: 8, y: -8 },
      { x: 8, y: 8 },
    ];
    const collision = createWithCollision(triangle).sources[0].tiles[0]
      .collision as readonly Vector2[];

    triangle[0].x = 0;

    expect(collision).toEqual([
      { x: -8, y: 8 },
      { x: 8, y: -8 },
      { x: 8, y: 8 },
    ]);
    expect(Object.isFrozen(collision)).toBe(true);
    expect(Object.isFrozen(collision[0])).toBe(true);
  });

  it('stores a polygon given with negative winding reversed', () => {
    const collision = createWithCollision([
      { x: 8, y: 8 },
      { x: 8, y: -8 },
      { x: -8, y: 8 },
    ]).sources[0].tiles[0].collision as readonly Vector2[];

    expect(calculateSignedArea(collision)).toBeGreaterThan(0);
    expect(collision).toEqual([
      { x: -8, y: 8 },
      { x: 8, y: -8 },
      { x: 8, y: 8 },
    ]);
  });

  it('throws for fewer than 3 points, naming the tile and source', () => {
    expect(() =>
      createWithCollision([
        { x: 0, y: 0 },
        { x: 8, y: 8 },
      ]),
    ).toThrow(
      'tile 0 of source 0 has a collision polygon with 2 points, and a polygon needs at least 3.',
    );
  });

  it('throws for a point that is not finite', () => {
    expect(() =>
      createWithCollision([
        { x: 0, y: 0 },
        { x: Number.NaN, y: 8 },
        { x: 0, y: 8 },
      ]),
    ).toThrow(
      /tile 0 of source 0 has a collision polygon whose point 1 is \(NaN, 8\), which must be finite/,
    );
  });

  it.each([
    ['an orthogonal', square, { x: 9, y: 0 }],
    ['an isometric', diamond, { x: 24, y: -8 }],
  ])(
    'throws for a point outside %s footprint',
    (_name, tileLayout, outside) => {
      expect(() =>
        createWithCollision(
          [{ x: 0, y: 0 }, outside, { x: 0, y: 8 }],
          tileLayout,
        ),
      ).toThrow(
        /tile 0 of source 0 has a collision polygon whose point 1, .* is outside the cell's footprint/,
      );
    },
  );

  it('accepts points exactly on the footprint and within half a step outside it', () => {
    expect(() =>
      createWithCollision([
        { x: -8, y: -8 },
        { x: 8 + step * 0.4, y: -8 },
        { x: 8, y: 8 + step * 0.4 },
      ]),
    ).not.toThrow();
    expect(() =>
      createWithCollision(
        [
          { x: 0, y: -16 },
          { x: 32, y: 0 },
          { x: 0, y: 16 },
        ],
        diamond,
      ),
    ).not.toThrow();
    expect(() =>
      createWithCollision([
        { x: -8, y: -8 },
        { x: 8 + step, y: -8 },
        { x: 8, y: 8 },
      ]),
    ).toThrow(/outside the cell's footprint/);
  });

  it('throws for a star whose points all turn the same way', () => {
    const star = [0, 2, 4, 1, 3].map((index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;

      return { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 };
    });

    expect(() => createWithCollision(star)).toThrow(
      'tile 0 of source 0 has a collision polygon that crosses itself',
    );
  });

  it('throws for an edge that turns straight back', () => {
    expect(() =>
      createWithCollision([
        { x: -4, y: -4 },
        { x: 4, y: -4 },
        { x: 0, y: -4 },
        { x: 0, y: 4 },
      ]),
    ).toThrow(/isn’t strictly convex/);
  });

  it('accepts a point in the middle of a side and one a fraction of a step inside it', () => {
    expect(() =>
      createWithCollision([
        { x: -8, y: -8 },
        { x: 0, y: -8 },
        { x: 8, y: -8 },
        { x: 8, y: 8 },
        { x: -8, y: 8 },
      ]),
    ).not.toThrow();
    expect(() =>
      createWithCollision([
        { x: -8, y: -8 },
        { x: 0, y: -8 + step * 0.2 },
        { x: 8, y: -8 },
        { x: 8, y: 8 },
        { x: -8, y: 8 },
      ]),
    ).not.toThrow();
  });

  it('throws, naming the transform bits, for a shape that snaps into a reflex point in one variant', () => {
    // On a one-unit cell, a step is 2^-16, so these are exact. Math.round
    // rounds halves up, so a point half a step from a grid line snaps one
    // way untransformed and the other way flipped. Untransformed, B snaps
    // above the line from A to C; flipped vertically it snaps below it.
    const unit = createOrthogonalGridLayout({ cellWidth: 1, cellHeight: 1 });
    const unitStep = 1 / 65_536;
    const atSteps = (x: number, y: number): Vector2 => ({
      x: x * unitStep - 0.5,
      y: y * unitStep - 0.5,
    });

    expect(() =>
      createWithCollision(
        [
          atSteps(0, 0.5),
          atSteps(5, 0.75),
          atSteps(10, 1.5),
          atSteps(10, 65_536),
          atSteps(0, 65_536),
        ],
        unit,
      ),
    ).toThrow(
      /isn’t strictly convex when turned by the transform bits flip Y, once snapped/,
    );
  });

  it('names a transpose in the transform bits of a variant that fails', () => {
    // The shape above, transposed: B is now half a step from a grid line
    // in x, which the transpose moves into y before flip Y mirrors it.
    const unit = createOrthogonalGridLayout({ cellWidth: 1, cellHeight: 1 });
    const unitStep = 1 / 65_536;
    const atSteps = (x: number, y: number): Vector2 => ({
      x: x * unitStep - 0.5,
      y: y * unitStep - 0.5,
    });

    expect(() =>
      createWithCollision(
        [
          atSteps(0.5, 0),
          atSteps(0.75, 5),
          atSteps(1.5, 10),
          atSteps(65_536, 10),
          atSteps(65_536, 0),
        ],
        unit,
      ),
    ).toThrow(
      /isn’t strictly convex when turned by the transform bits flip Y, transpose, once snapped/,
    );
  });

  it('names a flip X in the transform bits of a variant that fails', () => {
    // B is half a step from a grid line in both x and y, beside the corner
    // cut along x + y = 65,531 steps. Untransformed it snaps outwards; flipped
    // in only one axis it snaps onto the cut, and is dropped; flipped in both
    // it snaps inwards, into a reflex point.
    const unit = createOrthogonalGridLayout({ cellWidth: 1, cellHeight: 1 });
    const unitStep = 1 / 65_536;
    const atSteps = (x: number, y: number): Vector2 => ({
      x: x * unitStep - 0.5,
      y: y * unitStep - 0.5,
    });

    expect(() =>
      createWithCollision(
        [
          atSteps(0, 0),
          atSteps(65_536, 0),
          atSteps(65_536, 65_531),
          atSteps(65_533.5, 65_533.5),
          atSteps(65_531, 65_536),
          atSteps(0, 65_536),
        ],
        unit,
      ),
    ).toThrow(
      /isn’t strictly convex when turned by the transform bits flip X, flip Y, once snapped/,
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
