import { clamp } from '../../math/index.js';

/**
 * Class to manage and track time-related information.
 */
export class Time {
  private _frames: number;

  private _rawTimeInMilliseconds: number;
  private _rawDeltaTimeInMilliseconds: number;
  private _deltaTimeInMilliseconds: number;
  private _timeInMilliseconds: number;
  private _previousTimeInMilliseconds: number;

  private _rawTimeInSeconds: number;
  private _rawDeltaTimeInSeconds: number;
  private _deltaTimeInSeconds: number;
  private _timeInSeconds: number;
  private _previousTimeInSeconds: number;

  private _timeScale: number;

  private readonly _times: number[];

  // `requestAnimationFrame` callback timestamps aren't guaranteed to be
  // monotonic relative to a `performance.now()` call made just before
  // scheduling them (the callback's timestamp can reflect when the frame
  // *started*, which can land slightly before that call) - occasionally
  // producing a negative raw delta on the frame right after a heavy
  // synchronous setup (e.g. constructing hundreds of entities), followed by
  // an oversized delta on the next frame once the browser catches up. Left
  // unclamped, a negative delta integrates bodies backwards for a tick, and
  // the following oversized delta then integrates a single, huge step from
  // that corrupted state - both can otherwise fling every unstable body
  // (e.g. a freshly-spawned stack of contacts with no warm-start data yet)
  // across the world in one frame. Clamping keeps every consumer of
  // `deltaTimeInMilliseconds`/`deltaTimeInSeconds` safe without requiring
  // each one (gravity, Euler integration, ...) to defend against this
  // individually.
  private static readonly _maxDeltaTimeInMilliseconds = 1000 / 15;

  /**
   * Creates an instance of Time.
   */
  constructor() {
    this._frames = 0;

    this._rawTimeInMilliseconds = 0;
    this._rawDeltaTimeInMilliseconds = 0;
    this._deltaTimeInMilliseconds = 0;
    this._timeInMilliseconds = 0;
    this._previousTimeInMilliseconds = 0;

    this._rawTimeInSeconds = 0;
    this._rawDeltaTimeInSeconds = 0;
    this._deltaTimeInSeconds = 0;
    this._timeInSeconds = 0;
    this._previousTimeInSeconds = 0;

    this._timeScale = 1;
    this._times = [];
  }

  /**
   * Gets the number of frames: the number of times `update` has been called.
   * @returns The number of frames.
   */
  get frames(): number {
    return this._frames;
  }

  /**
   * Gets the raw time in milliseconds: the timestamp passed to the latest
   * `update`, not affected by `timeScale`.
   * @returns The raw time in milliseconds.
   */
  get rawTimeInMilliseconds(): number {
    return this._rawTimeInMilliseconds;
  }

  /**
   * Gets the raw delta time in milliseconds: the difference between the
   * latest two timestamps passed to `update`, not scaled or limited.
   * @returns The raw delta time in milliseconds.
   */
  get rawDeltaTimeInMilliseconds(): number {
    return this._rawDeltaTimeInMilliseconds;
  }

  /**
   * Gets the delta time in milliseconds: the raw delta time multiplied by
   * `timeScale`, limited to the range `0` to `1000 / 15` (except on the first
   * `update`).
   * @returns The delta time in milliseconds.
   */
  get deltaTimeInMilliseconds(): number {
    return this._deltaTimeInMilliseconds;
  }

  /**
   * Gets the time in milliseconds: the sum of every frame's delta time, so it
   * follows `timeScale`.
   * @returns The time in milliseconds.
   */
  get timeInMilliseconds(): number {
    return this._timeInMilliseconds;
  }

  /**
   * Gets the previous time in milliseconds: the raw time of the previous
   * `update`.
   * @returns The previous time in milliseconds.
   */
  get previousTimeInMilliseconds(): number {
    return this._previousTimeInMilliseconds;
  }

  /**
   * Gets the raw time in seconds: the timestamp passed to the latest
   * `update`, not affected by `timeScale`.
   * @returns The raw time in seconds.
   */
  get rawTimeInSeconds(): number {
    return this._rawTimeInSeconds;
  }

  /**
   * Gets the raw delta time in seconds: the difference between the latest
   * two timestamps passed to `update`, not scaled or limited.
   * @returns The raw delta time in seconds.
   */
  get rawDeltaTimeInSeconds(): number {
    return this._rawDeltaTimeInSeconds;
  }

  /**
   * Gets the delta time in seconds: the raw delta time multiplied by
   * `timeScale`, limited to the range `0` to `1 / 15` (except on the first
   * `update`).
   * @returns The delta time in seconds.
   */
  get deltaTimeInSeconds(): number {
    return this._deltaTimeInSeconds;
  }

  /**
   * Gets the time in seconds: the sum of every frame's delta time, so it
   * follows `timeScale`.
   * @returns The time in seconds.
   */
  get timeInSeconds(): number {
    return this._timeInSeconds;
  }

  /**
   * Gets the previous time in seconds: the raw time of the previous
   * `update`.
   * @returns The previous time in seconds.
   */
  get previousTimeInSeconds(): number {
    return this._previousTimeInSeconds;
  }

  /**
   * Gets the time scale, the multiplier applied to the delta time. `1` is
   * normal speed and `0` pauses time. Defaults to `1`.
   * @returns The time scale.
   */
  get timeScale(): number {
    return this._timeScale;
  }

  /**
   * Sets the time scale.
   * @param value - The new time scale.
   */
  set timeScale(value: number) {
    this._timeScale = value;
  }

  /**
   * Gets the timestamps, in milliseconds, of the `update` calls within the
   * last second. `fps` is its length.
   * @returns The times array.
   */
  get times(): number[] {
    return this._times;
  }

  /**
   * Updates the time-related information. `Game` calls it once per frame,
   * before updating its worlds.
   * @param time - The current time in milliseconds, such as
   * `performance.now()`.
   */
  public update(time: number): void {
    // The very first call has no real previous frame to delta from
    // (`_rawTimeInMilliseconds` starts at 0), so its "delta" is really the
    // timestamp's arbitrary offset from whatever epoch the caller's clock
    // uses (e.g. a `requestAnimationFrame` timestamp measured from page
    // navigation start) - clamping it would permanently offset every
    // accumulated time value behind the real elapsed time.
    const isFirstUpdate = this._frames === 0;

    this._frames++;

    this._previousTimeInMilliseconds = this._rawTimeInMilliseconds;
    this._rawTimeInMilliseconds = time;
    this._rawDeltaTimeInMilliseconds = time - this._previousTimeInMilliseconds;
    this._deltaTimeInMilliseconds = isFirstUpdate
      ? this._rawDeltaTimeInMilliseconds * this._timeScale
      : clamp(
          this._rawDeltaTimeInMilliseconds * this._timeScale,
          0,
          Time._maxDeltaTimeInMilliseconds,
        );
    this._timeInMilliseconds =
      this._timeInMilliseconds + this._deltaTimeInMilliseconds;

    this._previousTimeInSeconds = this._rawTimeInSeconds;
    this._rawTimeInSeconds = time / 1000;
    this._rawDeltaTimeInSeconds = time / 1000 - this._previousTimeInSeconds;
    this._deltaTimeInSeconds = this._deltaTimeInMilliseconds / 1000;
    this._timeInSeconds = this._timeInSeconds + this._deltaTimeInSeconds;

    while (this._times.length > 0 && this._times[0] <= time - 1000) {
      this._times.shift();
    }

    this._times.push(time);
  }

  /**
   * Gets the current frames per second (FPS): the number of `update` calls
   * within the last second.
   * @returns The current FPS.
   */
  get fps(): number {
    return this._times.length;
  }
}
