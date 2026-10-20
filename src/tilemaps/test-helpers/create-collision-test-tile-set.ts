import { GridLayout, Vector2 } from '../../math/index.js';
import { createTileSet, TileSet } from '../tile-set/tile-set.js';
import { packTile, TileFields } from '../tiles/packed-tile.js';
import { createTestSource } from './create-test-tile-set.js';

/** A slope, solid in the bottom-right half of the cell, in cell space. */
export const slopeInCellSpace: readonly Vector2[] = [
  { x: 0, y: 1 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
];

/** A step, solid in the bottom half of the cell, in cell space. */
export const stepInCellSpace: readonly Vector2[] = [
  { x: 0, y: 0.5 },
  { x: 1, y: 0.5 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

/**
 * Maps a shape from a cell's cell space (the unit square) into tile-local
 * space, so the same shape works in any layout.
 * @param layout - The layout.
 * @param points - The shape, in cell space.
 * @returns The shape, in tile-local space.
 */
export const fromCellSpace = (
  layout: GridLayout,
  points: readonly Vector2[],
): Vector2[] =>
  points.map((point) =>
    layout.cellSpaceToLocal({ x: point.x - 0.5, y: point.y - 0.5 }),
  );

/** The full-cell tile of {@link createCollisionTestTileSet}. */
export const fullTileIndex = 0;

/** The slope tile of {@link createCollisionTestTileSet}. */
export const slopeTileIndex = 1;

/** The step tile of {@link createCollisionTestTileSet}. */
export const stepTileIndex = 2;

/** The tile of {@link createCollisionTestTileSet} that doesn't collide. */
export const openTileIndex = 3;

/**
 * Packs a tile of {@link createCollisionTestTileSet}.
 * @param tile - The tile index.
 * @param fields - Transform bits to set.
 * @returns The packed tile.
 */
export const collisionTestTile = (
  tile: number,
  fields: Omit<TileFields, 'source' | 'tile'> = {},
): number => packTile({ source: 0, tile, ...fields });

/**
 * Builds a tile set of one source with four tiles: a full cell, a slope, a
 * step and a tile that doesn't collide.
 * @param layout - The layout.
 * @returns The tile set.
 */
export const createCollisionTestTileSet = (layout: GridLayout): TileSet =>
  createTileSet({
    layout,
    sources: [
      createTestSource(2, 2, {
        tiles: new Map([
          [fullTileIndex, { collision: 'cell' }],
          [
            slopeTileIndex,
            { collision: fromCellSpace(layout, slopeInCellSpace) },
          ],
          [
            stepTileIndex,
            { collision: fromCellSpace(layout, stepInCellSpace) },
          ],
        ]),
      }),
    ],
  });
