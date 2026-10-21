// Converts Tiled's gids to packed tiles. Not exported from the package.

import { emptyTile, packTile } from '../../tiles/packed-tile.js';

/** The range of gids a tileset takes in a map. */
export interface TiledGidRange {
  /** The tileset's first gid. */
  readonly firstGid: number;

  /** How many tiles the tileset has. */
  readonly tileCount: number;
}

/** Bit 31 of a gid: mirror the tile left to right. */
export const horizontalFlipGidBit = 0x8000_0000;

/** Bit 30 of a gid: mirror the tile top to bottom. */
export const verticalFlipGidBit = 0x4000_0000;

/** Bit 29 of a gid: mirror the tile across its top-left/bottom-right line. */
export const diagonalFlipGidBit = 0x2000_0000;

/** Bit 28 of a gid: turn a hexagonal tile 120 degrees. */
const hexagonalRotationGidBit = 0x1000_0000;

/** The tile id of a gid, below its flag bits. */
export const gidIdMask = 0x0fff_ffff;

/**
 * Converts gids to packed tiles. Tiled's flag bits are Forge's transform
 * bits, in the same positions and applied in the same order, so they copy
 * across: bit 31 is flip X, bit 30 flip Y and bit 29 transpose.
 */
export type TiledGidConverter = (gid: number, describe: () => string) => number;

/**
 * Creates a converter from a map's gids to packed tiles in its tile set,
 * whose source `i` is the tileset at index `i` of `ranges`.
 * @param ranges - The map's tilesets, sorted by `firstGid`.
 * @returns The converter. It takes a gid (`0` for an empty cell) and a
 * function describing where it is, for error messages, and returns the
 * packed tile. It throws if bit 28 (hexagonal rotation) is set, or the gid
 * is in no tileset.
 */
export const createTiledGidConverter = (
  ranges: readonly TiledGidRange[],
): TiledGidConverter => {
  // Maps repeat a few gids many times.
  const converted = new Map<number, number>();

  const findSource = (id: number): number => {
    let low = 0;
    let high = ranges.length - 1;

    while (low < high) {
      const middle = Math.ceil((low + high) / 2);

      if (ranges[middle].firstGid <= id) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }

    return low;
  };

  return (gid, describe) => {
    if (gid === 0) {
      return emptyTile;
    }

    const cached = converted.get(gid);

    if (cached !== undefined) {
      return cached;
    }

    if (gid & hexagonalRotationGidBit) {
      throw new Error(
        `${describe()} has gid ${gid}, whose bit 28 (a hexagonal tile's 120-degree rotation) is set, which isn't supported.`,
      );
    }

    const id = gid & gidIdMask;
    const source = findSource(id);
    const { firstGid, tileCount } = ranges[source];
    const tile = id - firstGid;

    if (tile < 0 || tile >= tileCount) {
      throw new Error(
        `${describe()} has gid ${gid}, whose tile id ${id} isn't in any of the map's tilesets.`,
      );
    }

    const packed = packTile({
      source,
      tile,
      flipX: (gid & horizontalFlipGidBit) !== 0,
      flipY: (gid & verticalFlipGidBit) !== 0,
      transpose: (gid & diagonalFlipGidBit) !== 0,
    });

    converted.set(gid, packed);

    return packed;
  };
};
