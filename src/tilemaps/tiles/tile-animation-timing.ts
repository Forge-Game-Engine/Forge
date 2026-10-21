// Where a tile animation is at a given time. Not exported from the package:
// `getTileAnimationFrameIndex` and `getDisplayedTile` are the public way to
// read it.

import type { TileAnimationFrame } from '../tile-set/tile-set.js';

/**
 * How far into its frame an animation is, and which frame that is.
 */
interface FramePosition {
  /** The frame's index in the animation. */
  index: number;

  /** How long until the frame ends, in milliseconds. Always positive. */
  remaining: number;
}

// Reused by every call, so finding a frame allocates nothing.
const position: FramePosition = { index: 0, remaining: 0 };

/**
 * Finds the frame an animation shows at a time. Frame `0` starts at time
 * `0` and at every multiple of the animation's length (the sum of its
 * durations); each frame shows from its start for its duration.
 * @param animation - The frames, at least one, with positive durations.
 * @param timeInMilliseconds - A finite time.
 * @returns A shared object, overwritten by the next call.
 */
const findFrame = (
  animation: readonly TileAnimationFrame[],
  timeInMilliseconds: number,
): FramePosition => {
  let length = 0;

  for (const frame of animation) {
    length += frame.durationMilliseconds;
  }

  // In [0, length), also for negative times, which continue the cycle
  // backwards.
  let phase = ((timeInMilliseconds % length) + length) % length;

  for (let index = 0; index < animation.length; index++) {
    const duration = animation[index].durationMilliseconds;

    if (phase < duration) {
      position.index = index;
      position.remaining = duration - phase;

      return position;
    }

    phase -= duration;
  }

  // Floating-point error left the phase at the very end of the cycle: it's
  // the last frame's last moment, and frame 0 starts next.
  position.index = animation.length - 1;
  position.remaining = Number.MIN_VALUE;

  return position;
};

/**
 * Finds the index of the frame an animation shows at a time.
 * @param animation - The frames, at least one, with positive durations.
 * @param timeInMilliseconds - A finite time.
 * @returns The index of the frame in `animation`.
 */
export const getFrameIndexAt = (
  animation: readonly TileAnimationFrame[],
  timeInMilliseconds: number,
): number => findFrame(animation, timeInMilliseconds).index;

/**
 * Finds the first time after `timeInMilliseconds` at which the frame an
 * animation shows changes.
 * @param animation - The frames, at least one, with positive durations.
 * @param timeInMilliseconds - A finite time.
 * @returns The time the current frame ends, in milliseconds. Never less
 * than `timeInMilliseconds`.
 */
export const getNextFrameChangeTime = (
  animation: readonly TileAnimationFrame[],
  timeInMilliseconds: number,
): number =>
  timeInMilliseconds + findFrame(animation, timeInMilliseconds).remaining;
