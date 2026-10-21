import {
  describeMalformedTile,
  flipXBit,
  flipYBit,
  getTileIndex,
  getTileSourceIndex,
  presentBit,
  sourceMask,
  sourceShift,
  tileMask,
  transposeBit,
} from './packed-tile-bits.js';
import { withDefaults } from '../../utilities/with-defaults.js';

/** The packed tile of an empty cell, `0`. */
export const emptyTile = 0;

/** The largest source index a packed tile holds. */
const maxSource = sourceMask;

/** The largest tile index a packed tile holds. */
const maxTile = tileMask;

/**
 * The fields of a packed tile, for {@link packTile}.
 */
export interface TileFields {
  /** The index of the tile's source in its tile set's `sources`, `0` to `255`. */
  source: number;

  /**
   * The index of the tile in its source: the index of its region in the
   * source's atlas, `0` to `1,048,575`.
   */
  tile: number;

  /** Mirror the image left to right. Defaults to `false`. */
  flipX?: boolean;

  /** Mirror the image top to bottom on screen. Defaults to `false`. */
  flipY?: boolean;

  /**
   * Swap the image's X and Y axes, applied before the flips. Defaults to
   * `false`.
   */
  transpose?: boolean;
}

const defaultTileFields = {
  flipX: false,
  flipY: false,
  transpose: false,
};

/**
 * Packs a tile into the number a tilemap cell holds: an unsigned 32-bit
 * integer naming a tile set source, a tile in that source, and how the
 * tile's image is turned or mirrored. `0` ({@link emptyTile}) is an empty
 * cell. Read a packed tile with {@link unpackTile}, and compare two with
 * `===`. The result is always positive, so it equals what a `Uint32Array`
 * stores.
 *
 * | Bits  | Field     | Meaning                                                                      |
 * | ----- | --------- | ---------------------------------------------------------------------------- |
 * | 31    | flipX     | Mirror the image left to right                                               |
 * | 30    | flipY     | Mirror the image top to bottom on screen (Y-down)                            |
 * | 29    | transpose | Swap the image's X and Y axes (mirror across its top-left/bottom-right line) |
 * | 28    | present   | Always `1` in a non-empty tile, so no tile packs to `0`                      |
 * | 20–27 | source    | Source index, `0` to `255`                                                   |
 * | 0–19  | tile      | Tile index in the source, `0` to `1,048,575`                                 |
 *
 * The transform bits are where Tiled keeps its horizontal, vertical and
 * diagonal flip flags, and mean the same thing. They move the image's
 * content within its own normalized coordinates (`(0, 0)` top-left,
 * `(1, 1)` bottom-right): transpose first (`(u, v) -> (v, u)`), then flip X
 * (`(u, v) -> (1 - u, v)`), then flip Y (`(u, v) -> (u, 1 - v)`). The
 * flips leave the image's rect where it is; transpose swaps its width and
 * height, keeping its bottom-left corner, so a non-square tile turns
 * rather than stretches, as in Tiled (see `getTileImageRect`). Together the
 * bits give all eight 90-degree rotations and mirrors:
 *
 * | transpose | flipX | flipY | On screen                                      |
 * | --------- | ----- | ----- | ---------------------------------------------- |
 * | 0         | 0     | 0     | As drawn                                       |
 * | 0         | 1     | 0     | Mirrored left to right                         |
 * | 0         | 0     | 1     | Mirrored top to bottom                         |
 * | 0         | 1     | 1     | Turned 180 degrees                             |
 * | 1         | 1     | 0     | Turned 90 degrees clockwise                    |
 * | 1         | 0     | 1     | Turned 90 degrees counter-clockwise            |
 * | 1         | 0     | 0     | Mirrored across the top-left/bottom-right line |
 * | 1         | 1     | 1     | Mirrored across the top-right/bottom-left line |
 *
 * Code that draws a tile through texture coordinates samples through the
 * inverse: the screen point `p` shows the content that moved there. Only
 * the two 90-degree turns differ from their inverse; each is the other's.
 * @param fields - The tile's source, index and transform bits.
 * @returns The packed tile, never `emptyTile`.
 * @throws An error if `source` isn't a whole number from `0` to `255`, or
 * `tile` isn't a whole number from `0` to `1,048,575`.
 */
export function packTile(fields: TileFields): number {
  const { source, tile, flipX, flipY, transpose } = withDefaults(
    defaultTileFields,
    fields,
  );

  if (!Number.isInteger(source) || source < 0 || source > maxSource) {
    throw new Error(
      `Unable to pack a tile: its source (${source}) must be a whole number from 0 to ${maxSource}.`,
    );
  }

  if (!Number.isInteger(tile) || tile < 0 || tile > maxTile) {
    throw new Error(
      `Unable to pack a tile: its tile index (${tile}) must be a whole number from 0 to ${maxTile}.`,
    );
  }

  const transformBits =
    (flipX ? flipXBit : 0) |
    (flipY ? flipYBit : 0) |
    (transpose ? transposeBit : 0);

  // Bitwise operators give signed 32-bit results, so a set bit 31 would
  // make the tile negative; `>>> 0` reads it back as unsigned.
  return (transformBits | presentBit | (source << sourceShift) | tile) >>> 0;
}

/**
 * Reads the fields of a packed tile.
 * @param tile - The packed tile.
 * @returns A new object holding every field of the tile.
 * @throws An error if `tile` is `emptyTile`, isn't a whole number from `0`
 * to `2^32 - 1`, or has bit 28 clear.
 */
export function unpackTile(tile: number): Required<TileFields> {
  const problem = describeMalformedTile(tile);

  if (problem) {
    throw new Error(`Unable to unpack a tile: ${problem}`);
  }

  if (tile === emptyTile) {
    throw new Error(
      'Unable to unpack a tile: it is the empty tile (0), which has no fields. Check for emptyTile first.',
    );
  }

  return {
    source: getTileSourceIndex(tile),
    tile: getTileIndex(tile),
    flipX: (tile & flipXBit) !== 0,
    flipY: (tile & flipYBit) !== 0,
    transpose: (tile & transposeBit) !== 0,
  };
}
