import { describe, expect, it } from 'vitest';
import {
  createIsometricGridLayout,
  createOrthogonalGridLayout,
  GridLayout,
  Vector2,
} from '../../../math/index.js';
import { calculateSignedArea } from '../../../physics/colliders/polygon-math.js';
import type {
  TiledObjectFile,
  TiledTileSetFile,
} from '../file-data/tiled-file-data.js';
import {
  type TileCollisionContext,
  toTileCollisionShape,
} from './convert-tile-collision.js';

const tileSetFile = (
  fields: Partial<TiledTileSetFile> = {},
): TiledTileSetFile => ({
  name: 'walls',
  image: 'walls.png',
  imageWidth: 64,
  imageHeight: 64,
  tileWidth: 16,
  tileHeight: 16,
  margin: 0,
  spacing: 0,
  columns: 4,
  tileCount: 16,
  tileOffset: { x: 0, y: 0 },
  grid: null,
  objectAlignment: 'unspecified',
  tileRenderSize: 'tile',
  properties: [],
  tiles: [],
  describe: 'tileset "walls.tsj"',
  ...fields,
});

const object = (fields: Partial<TiledObjectFile> = {}): TiledObjectFile => ({
  id: 1,
  name: '',
  type: '',
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  visible: true,
  kind: 'rectangle',
  gid: null,
  points: null,
  text: null,
  properties: [],
  path: 'tiles[0].objectgroup.objects[0]',
  ...fields,
});

const orthogonal = createOrthogonalGridLayout({
  cellWidth: 16,
  cellHeight: 16,
});
const isometric = createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 });

const context = (
  fields: Partial<TileCollisionContext> = {},
): TileCollisionContext => ({
  layout: orthogonal,
  mapOrientation: 'orthogonal',
  mapTileWidth: 16,
  mapTileHeight: 16,
  tileSet: tileSetFile(),
  drawnSize: { x: 16, y: 16 },
  textureOrigin: { x: 0, y: 0 },
  describeTile: 'tile 3 of tileset "walls.tsj"',
  ...fields,
});

/** Sorts points top to bottom, then left to right, ignoring rounding errors. */
const sortPoints = (points: readonly Vector2[]): Vector2[] => {
  const round = (value: number): number => Math.round(value * 1e6);

  return [...points].sort(
    (a, b) => round(a.y) - round(b.y) || round(a.x) - round(b.x),
  );
};

const expectSamePoints = (
  actual: readonly Vector2[] | 'cell' | null,
  expected: readonly Vector2[],
): void => {
  if (actual === null || actual === 'cell') {
    throw new Error(`Expected a polygon, got ${String(actual)}.`);
  }

  const sortedActual = sortPoints(actual);
  const sortedExpected = sortPoints(expected);

  expect(sortedActual).toHaveLength(sortedExpected.length);
  sortedActual.forEach((point, index) => {
    expect(point.x).toBeCloseTo(sortedExpected[index].x, 9);
    expect(point.y).toBeCloseTo(sortedExpected[index].y, 9);
  });
};

/** A tile-local point of an isometric cell, from its cell-space position. */
const isometricPoint = (layout: GridLayout, x: number, y: number): Vector2 => {
  const point = layout.cellSpaceToLocal({ x, y });
  const center = layout.getCellCenter(0, 0);

  return { x: point.x - center.x, y: point.y - center.y };
};

describe('toTileCollisionShape', () => {
  it('gives null for a tile without collision objects', () => {
    expect(toTileCollisionShape(null, context())).toBeNull();
    expect(toTileCollisionShape([], context())).toBeNull();
  });

  it('gives a rectangle over the whole image the whole cell', () => {
    expect(
      toTileCollisionShape([object({ width: 16, height: 16 })], context()),
    ).toBe('cell');
  });

  it('measures an orthogonal-grid shape from the image’s top-left, in tile-local space', () => {
    expectSamePoints(
      toTileCollisionShape(
        [object({ x: 4, y: 8, width: 8, height: 8 })],
        context(),
      ),
      [
        { x: -4, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 8 },
        { x: -4, y: 8 },
      ],
    );
  });

  it('rotates a rectangle clockwise about its origin, in degrees', () => {
    expectSamePoints(
      toTileCollisionShape(
        [object({ x: 8, y: 0, width: 8, height: 8, rotation: 90 })],
        context(),
      ),
      [
        { x: -8, y: -8 },
        { x: 0, y: -8 },
        { x: 0, y: 0 },
        { x: -8, y: 0 },
      ],
    );
  });

  it('clips a tall tile’s whole-image rectangle to its footprint, moved by its offset', () => {
    const shape = toTileCollisionShape(
      [object({ width: 16, height: 32 })],
      context({
        tileSet: tileSetFile({ tileHeight: 32 }),
        drawnSize: { x: 16, y: 32 },
        textureOrigin: { x: -2, y: 4 },
      }),
    );

    // The image spans x -10 to 6 and y -20 to 12 around the cell's center.
    expectSamePoints(shape, [
      { x: -8, y: -8 },
      { x: 6, y: -8 },
      { x: 6, y: 8 },
      { x: -8, y: 8 },
    ]);
  });

  it('gives a tall wall’s whole-image rectangle the whole cell when it covers the footprint', () => {
    expect(
      toTileCollisionShape(
        [object({ width: 16, height: 32 })],
        context({
          tileSet: tileSetFile({ tileHeight: 32 }),
          drawnSize: { x: 16, y: 32 },
        }),
      ),
    ).toBe('cell');
  });

  it('scales a shape with an image drawn at the cell size', () => {
    expectSamePoints(
      toTileCollisionShape(
        [object({ width: 16, height: 16 })],
        context({
          tileSet: tileSetFile({ tileWidth: 32, tileHeight: 32 }),
        }),
      ),
      [
        { x: -8, y: -8 },
        { x: 0, y: -8 },
        { x: 0, y: 0 },
        { x: -8, y: 0 },
      ],
    );
  });

  it('keeps a convex polygon, offset by its origin', () => {
    expectSamePoints(
      toTileCollisionShape(
        [
          object({
            kind: 'polygon',
            x: 0,
            y: 16,
            points: [
              { x: 0, y: 0 },
              { x: 16, y: -16 },
              { x: 16, y: 0 },
            ],
          }),
        ],
        context(),
      ),
      [
        { x: 8, y: -8 },
        { x: -8, y: 8 },
        { x: 8, y: 8 },
      ],
    );
  });

  it('projects an isometric-grid shape through the layout, a cell being the grid height along each axis', () => {
    const isometricContext = context({
      layout: isometric,
      mapOrientation: 'isometric',
      mapTileWidth: 64,
      mapTileHeight: 32,
      tileSet: tileSetFile({
        tileWidth: 64,
        tileHeight: 64,
        grid: { orientation: 'isometric', width: 64, height: 32 },
      }),
      drawnSize: { x: 64, y: 64 },
    });

    expect(
      toTileCollisionShape(
        [object({ width: 32, height: 32 })],
        isometricContext,
      ),
    ).toBe('cell');
    expectSamePoints(
      toTileCollisionShape(
        [object({ x: 16, y: 0, width: 16, height: 32 })],
        isometricContext,
      ),
      [
        isometricPoint(isometric, 0.5, 0),
        isometricPoint(isometric, 1, 0),
        isometricPoint(isometric, 1, 1),
        isometricPoint(isometric, 0.5, 1),
      ],
    );
  });

  it('rotates an isometric-grid shape on screen about its projected origin', () => {
    const shape = toTileCollisionShape(
      [object({ x: 16, y: 16, width: 32, height: 32, rotation: 180 })],
      context({
        layout: isometric,
        mapOrientation: 'isometric',
        mapTileWidth: 64,
        mapTileHeight: 32,
        tileSet: tileSetFile({
          grid: { orientation: 'isometric', width: 64, height: 32 },
        }),
      }),
    );

    // The cell-sized diamond starts at the cell's center and reaches down
    // to the next cell's; turned half a turn about the center, it reaches
    // up instead, covering the cell's top quarter.
    expectSamePoints(shape, [
      isometricPoint(isometric, 0, 0),
      isometricPoint(isometric, 0.5, 0),
      isometricPoint(isometric, 0.5, 0.5),
      isometricPoint(isometric, 0, 0.5),
    ]);
  });

  it('measures an orthogonal-grid shape in an isometric map on the image', () => {
    const shape = toTileCollisionShape(
      [object({ x: 0, y: 32, width: 64, height: 32 })],
      context({
        layout: isometric,
        mapOrientation: 'isometric',
        mapTileWidth: 64,
        mapTileHeight: 32,
        tileSet: tileSetFile({ tileWidth: 64, tileHeight: 64 }),
        drawnSize: { x: 64, y: 64 },
      }),
    );

    // The image's lower half is the footprint's bounds.
    expect(shape).toBe('cell');
  });

  it('throws for an isometric grid in an orthogonal map, or of another size', () => {
    const tileSet = tileSetFile({
      grid: { orientation: 'isometric', width: 64, height: 32 },
    });

    expect(() =>
      toTileCollisionShape(
        [object({ width: 32, height: 32 })],
        context({ tileSet }),
      ),
    ).toThrow(
      'tile 3 of tileset "walls.tsj" has collision objects drawn on an isometric 64 x 32 grid, which only an isometric map with 64 x 32 tiles can load, and the map is orthogonal with 16 x 16 tiles.',
    );
  });

  it('throws for a concave polygon, naming the tile and the object', () => {
    expect(() =>
      toTileCollisionShape(
        [
          object({
            kind: 'polygon',
            points: [
              { x: 0, y: 0 },
              { x: 16, y: 0 },
              { x: 8, y: 4 },
              { x: 16, y: 16 },
              { x: 0, y: 16 },
            ],
          }),
        ],
        context(),
      ),
    ).toThrow(
      'tile 3 of tileset "walls.tsj"\'s collision polygon (tiles[0].objectgroup.objects[0]) is concave or crosses itself.',
    );
  });

  it.each(['ellipse', 'capsule', 'point', 'polyline', 'tile', 'text'] as const)(
    'throws for a %s',
    (kind) => {
      expect(() =>
        toTileCollisionShape(
          [object({ kind, width: 8, height: 8 })],
          context(),
        ),
      ).toThrow(
        `tile 3 of tileset "walls.tsj"'s collision object (tiles[0].objectgroup.objects[0]) is a ${kind}. A tile's collision shape must be a rectangle or a convex polygon.`,
      );
    },
  );

  it('throws for more than one object', () => {
    expect(() =>
      toTileCollisionShape(
        [
          object({ width: 8, height: 8 }),
          object({ x: 8, width: 8, height: 8 }),
        ],
        context(),
      ),
    ).toThrow(
      'tile 3 of tileset "walls.tsj" has 2 collision objects, and a tile can have one.',
    );
  });

  it('throws for a shape outside the cell’s footprint', () => {
    expect(() =>
      toTileCollisionShape(
        [object({ width: 16, height: 8 })],
        context({
          tileSet: tileSetFile({ tileHeight: 32 }),
          drawnSize: { x: 16, y: 32 },
        }),
      ),
    ).toThrow(
      "tile 3 of tileset \"walls.tsj\"'s collision rectangle (tiles[0].objectgroup.objects[0]) doesn't cover any of its cell's footprint.",
    );
  });

  it('gives a polygon with positive area once wound, whatever its winding in Tiled', () => {
    const shape = toTileCollisionShape(
      [
        object({
          kind: 'polygon',
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 8 },
            { x: 8, y: 8 },
          ],
        }),
      ],
      context(),
    );

    if (shape === null || shape === 'cell') {
      throw new Error('Expected a polygon.');
    }

    // Clipping keeps the shape's winding, which the tile set then fixes;
    // the area is all that matters here.
    expect(Math.abs(calculateSignedArea(shape))).toBeCloseTo(64);
  });
});
