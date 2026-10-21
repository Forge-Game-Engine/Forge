// The bit layout of a packed tile, and allocation-free accessors over it,
// shared by the tilemap module. Not exported from the package: `packTile`
// and `unpackTile` are the public way to build and read a tile.

/** Bit 31: mirror the image left to right. */
export const flipXBit = 0x8000_0000;

/** Bit 30: mirror the image top to bottom. */
export const flipYBit = 0x4000_0000;

/** Bit 29: swap the image's X and Y axes. */
export const transposeBit = 0x2000_0000;

/** Bit 28: set in every non-empty tile, so none packs to `0`. */
export const presentBit = 0x1000_0000;

/** How far the source index is shifted up. */
export const sourceShift = 20;

/** The source index's mask, once shifted down. */
export const sourceMask = 0xff;

/** The tile index's mask. */
export const tileMask = 0xf_ffff;

/** The largest packed value, `2^32 - 1`. */
const maxUint32 = 0xffff_ffff;

/**
 * Reads a tile's source index.
 * @param tile - A well-formed, non-empty packed tile.
 * @returns The index of its source in the tile set.
 */
export const getTileSourceIndex = (tile: number): number =>
  (tile >>> sourceShift) & sourceMask;

/**
 * Reads a tile's index within its source.
 * @param tile - A well-formed, non-empty packed tile.
 * @returns The index of its region in the source's atlas.
 */
export const getTileIndex = (tile: number): number => tile & tileMask;

/**
 * Reads a tile's transform bits, shifted down: flip X is `4`, flip Y is `2`
 * and transpose is `1`.
 * @param tile - A packed tile.
 * @returns A number from `0` to `7`.
 */
export const getTileTransformBits = (tile: number): number => tile >>> 29;

/**
 * Replaces a tile's index within its source, keeping its source and
 * transform bits.
 * @param tile - A well-formed, non-empty packed tile.
 * @param tileIndex - The new tile index, `0` to `tileMask`.
 * @returns The packed tile.
 */
export const withTileIndex = (tile: number, tileIndex: number): number =>
  ((tile & ~tileMask) | tileIndex) >>> 0;

/**
 * Drops a tile's transform bits: the tile packed with only its source and
 * index, as `packTile({ source, tile })` packs it.
 * @param tile - A well-formed, non-empty packed tile.
 * @returns The packed tile without transform bits.
 */
export const withoutTransformBits = (tile: number): number =>
  tile & (presentBit | (sourceMask << sourceShift) | tileMask);

/**
 * Says what's wrong with a value given as a packed tile, other than the
 * tile set it's used with.
 * @param tile - The value.
 * @returns A sentence describing the problem, or `null` if the value is
 * `0` (empty) or a well-formed packed tile.
 */
export const describeMalformedTile = (tile: number): string | null => {
  if (!Number.isInteger(tile) || tile < 0 || tile > maxUint32) {
    return `${tile} isn't a packed tile: a packed tile is a whole number from 0 to ${maxUint32}. Build one with packTile.`;
  }

  if (tile !== 0 && (tile & presentBit) === 0) {
    return `${tile} isn't a packed tile: its bit 28 is clear, which only the empty tile (0) may have. Build one with packTile.`;
  }

  return null;
};
