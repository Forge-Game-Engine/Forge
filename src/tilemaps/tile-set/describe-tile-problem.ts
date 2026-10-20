// Checks a packed tile against a tile set. Not exported from the package.

import {
  describeMalformedTile,
  getTileIndex,
  getTileSourceIndex,
} from '../tiles/packed-tile-bits.js';
import type { TileSet } from './tile-set.js';

/**
 * Says what's wrong with a packed tile, used with a tile set.
 * @param tileSet - The tile set the tile is used with.
 * @param tile - The packed tile.
 * @returns A sentence describing the problem, or `null` if the tile is
 * empty or one of the tile set's tiles.
 */
export const describeTileProblem = (
  tileSet: TileSet,
  tile: number,
): string | null => {
  const malformed = describeMalformedTile(tile);

  if (malformed || tile === 0) {
    return malformed;
  }

  const sourceIndex = getTileSourceIndex(tile);
  const { sources } = tileSet;

  if (sourceIndex >= sources.length) {
    return `its source ${sourceIndex} doesn't exist, the tile set has ${sources.length} ${sources.length === 1 ? 'source' : 'sources'}.`;
  }

  const tileIndex = getTileIndex(tile);
  const tileCount = sources[sourceIndex].tiles.length;

  if (tileIndex >= tileCount) {
    return `its tile ${tileIndex} doesn't exist, source ${sourceIndex} of the tile set has ${tileCount} ${tileCount === 1 ? 'tile' : 'tiles'}.`;
  }

  return null;
};
