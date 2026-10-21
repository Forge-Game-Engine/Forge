import { Rect } from '../../math/index.js';
import { assertCell } from '../cells/chunk-key.js';
import { getTileData, TileSet } from '../tile-set/tile-set.js';
import { getTileSourceIndex, transposeBit } from './packed-tile-bits.js';

/**
 * Finds where a tile's image sits when it's in a cell, in layer-local
 * space. This is Tiled's placement rule, for every layout: the image is its
 * source's `tileWidth` by `tileHeight`, its bottom-left corner sits on the
 * bottom-left corner of the cell footprint's bounds, and then it moves by
 * the tile's `textureOrigin` (Y-down). An image taller than the cell
 * reaches up from the footprint, the way isometric walls do.
 *
 * A tile with its transpose bit set is turned a quarter turn, so its rect
 * is `tileHeight` wide and `tileWidth` tall, with the same bottom-left
 * corner, as Tiled draws it: a 16 x 32 tile turned on its side covers
 * 32 x 16. The flip bits don't move or resize the rect; they change what's
 * drawn inside it.
 * @param tileSet - The tile set the tile belongs to.
 * @param column - The cell's column.
 * @param row - The cell's row.
 * @param tile - The packed tile.
 * @returns A new `Rect` holding the image's bounds, in layer-local space.
 * @throws An error if `column` or `row` isn't a whole number from `-2^30`
 * to `2^30 - 1`, or `tile` is `emptyTile` or malformed, or names a source
 * or tile index the tile set doesn't have.
 */
export function getTileImageRect(
  tileSet: TileSet,
  column: number,
  row: number,
  tile: number,
): Rect {
  assertCell('find the image of the tile', column, row);

  const { textureOrigin } = getTileData(tileSet, tile);
  const { tileWidth, tileHeight } = tileSet.sources[getTileSourceIndex(tile)];
  const transposed = (tile & transposeBit) !== 0;
  const width = transposed ? tileHeight : tileWidth;
  const height = transposed ? tileWidth : tileHeight;
  const { layout } = tileSet;
  const bounds = layout.getCellFootprintBounds(column, row);

  // Each edge is measured from the footprint edge it lines up with, rather
  // than as `left + width`, so a cell-sized tile gets its footprint's edges
  // exactly: the layout computes neighbors' shared edges from the same
  // integer cell corners, and a rounding difference between them would show
  // as a crack between drawn tiles.
  return {
    min: {
      x: bounds.min.x + textureOrigin.x,
      y: bounds.min.y + textureOrigin.y - (height - layout.cellHeight),
    },
    max: {
      x: bounds.max.x + textureOrigin.x + (width - layout.cellWidth),
      y: bounds.max.y + textureOrigin.y,
    },
  };
}
