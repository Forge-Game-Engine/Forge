import {
  getTileData,
  TileAnimationFrame,
  TileSet,
} from '../tile-set/tile-set.js';
import { withTileIndex } from './packed-tile-bits.js';
import { getFrameIndexAt } from './tile-animation-timing.js';

const assertFiniteTime = (action: string, timeInMilliseconds: number): void => {
  if (!Number.isFinite(timeInMilliseconds)) {
    throw new Error(
      `Unable to ${action}: the time (${timeInMilliseconds}) must be a finite number of milliseconds.`,
    );
  }
};

/**
 * Finds which frame of a tile animation shows at a time. Every animation
 * is in step with the clock: frame `0` starts at time `0` and at every
 * multiple of the animation's length (the sum of its durations), and each
 * frame shows from its start for its `durationMilliseconds`. A time exactly
 * at a frame's start shows that frame.
 * @param animation - The frames, at least one, as in `TileData.animation`.
 * @param timeInMilliseconds - The time, usually `time.timeInMilliseconds`.
 * Negative times continue the cycle backwards.
 * @returns The index of the frame in `animation`.
 * @throws An error if `animation` is empty or `timeInMilliseconds` isn't
 * finite.
 */
export function getTileAnimationFrameIndex(
  animation: readonly TileAnimationFrame[],
  timeInMilliseconds: number,
): number {
  if (animation.length === 0) {
    throw new Error(
      'Unable to find the frame of a tile animation: it has no frames.',
    );
  }

  assertFiniteTime('find the frame of a tile animation', timeInMilliseconds);

  return getFrameIndexAt(animation, timeInMilliseconds);
}

/**
 * Finds the tile whose image a cell holding `tile` shows at a time: `tile`
 * itself if it has no animation, or else `tile` with its tile index
 * replaced by the current frame's, keeping its source and transform bits.
 * `createTilemapRenderEcsSystem` draws exactly this at
 * `time.timeInMilliseconds`. Read the cell's data (properties, collision)
 * from the placed tile, not from this one.
 * @param tileSet - The tile set the tile belongs to.
 * @param tile - The placed tile.
 * @param timeInMilliseconds - The time, usually `time.timeInMilliseconds`.
 * @returns The packed displayed tile.
 * @throws An error if `tile` is `emptyTile` or malformed, names a source or
 * tile index the tile set doesn't have, or `timeInMilliseconds` isn't
 * finite.
 */
export function getDisplayedTile(
  tileSet: TileSet,
  tile: number,
  timeInMilliseconds: number,
): number {
  assertFiniteTime('find the displayed tile', timeInMilliseconds);

  const { animation } = getTileData(tileSet, tile);

  if (animation === null) {
    return tile;
  }

  return withTileIndex(
    tile,
    animation[getFrameIndexAt(animation, timeInMilliseconds)].tile,
  );
}
