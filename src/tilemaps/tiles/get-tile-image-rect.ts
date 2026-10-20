import { Rect } from '../../math/index.js';
import { getTileData, TileSet } from '../tile-set/tile-set.js';
import { getTileSourceIndex } from './packed-tile-bits.js';

/**
 * Finds where a tile's image sits when it's in a cell, in layer-local
 * space. This is Tiled's placement rule, for every layout: the image is its
 * source's `tileWidth` by `tileHeight`, its bottom-left corner sits on the
 * bottom-left corner of the cell footprint's bounds, and then it moves by
 * the tile's `textureOrigin` (Y-down). An image taller than the cell
 * reaches up from the footprint, the way isometric walls do. The transform
 * bits don't move or resize the rect; they change what's drawn inside it.
 * @param tileSet - The tile set the tile belongs to.
 * @param column - The cell's column.
 * @param row - The cell's row.
 * @param tile - The packed tile.
 * @returns A new `Rect` holding the image's bounds, in layer-local space.
 * @throws An error if `tile` is `emptyTile` or malformed, or names a source
 * or tile index the tile set doesn't have.
 */
export function getTileImageRect(
  tileSet: TileSet,
  column: number,
  row: number,
  tile: number,
): Rect {
  const { textureOrigin } = getTileData(tileSet, tile);
  const { tileWidth, tileHeight } = tileSet.sources[getTileSourceIndex(tile)];
  const bounds = tileSet.layout.getCellFootprintBounds(column, row);
  const left = bounds.min.x + textureOrigin.x;
  const bottom = bounds.max.y + textureOrigin.y;

  return {
    min: { x: left, y: bottom - tileHeight },
    max: { x: left + tileWidth, y: bottom },
  };
}
