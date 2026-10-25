import { clamp } from '../../math/index.js';

const defaultFixedDeltaTimeInMilliseconds = 1000 / 60;

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

  private _fixedDeltaTimeInMilliseconds: number;
  private _fixedStepDeltaTimeInMilliseconds: number;
  private _fixedAccumulatorInMilliseconds: number;
  private _fixedTimeInMilliseconds: number;
  private _isInFixedStep: boolean;

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

    this._fixedDeltaTimeInMilliseconds = defaultFixedDeltaTimeInMilliseconds;
    this._fixedStepDeltaTimeInMilliseconds = 0;
    this._fixedAccumulatorInMilliseconds = 0;
    this._fixedTimeInMilliseconds = 0;
    this._isInFixedStep = false;

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
   * `update`). While `isInFixedStep` is `true`, it's the size of the running
   * fixed step instead.
   * @returns The delta time in milliseconds.
   */
  get deltaTimeInMilliseconds(): number {
    if (this._isInFixedStep) {
      return this._fixedStepDeltaTimeInMilliseconds;
    }

    return this._deltaTimeInMilliseconds;
  }

  /**
   * Gets the time in milliseconds: the sum of every frame's delta time, so it
   * follows `timeScale`. While `isInFixedStep` is `true`, it's the fixed time
   * instead: the time at the end of the running fixed step, which is never
   * ahead of the frame's time.
   * @returns The time in milliseconds.
   */
  get timeInMilliseconds(): number {
    if (this._isInFixedStep) {
      return this._fixedTimeInMilliseconds;
    }

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
   * `update`). While `isInFixedStep` is `true`, it's the size of the running
   * fixed step instead.
   * @returns The delta time in seconds.
   */
  get deltaTimeInSeconds(): number {
    if (this._isInFixedStep) {
      return this._fixedStepDeltaTimeInMilliseconds / 1000;
    }

    return this._deltaTimeInSeconds;
  }

  /**
   * Gets the time in seconds: the sum of every frame's delta time, so it
   * follows `timeScale`. While `isInFixedStep` is `true`, it's the fixed time
   * instead: the time at the end of the running fixed step, which is never
   * ahead of the frame's time.
   * @returns The time in seconds.
   */
  get timeInSeconds(): number {
    if (this._isInFixedStep) {
      return this._fixedTimeInMilliseconds / 1000;
    }

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
   * Gets the fixed delta time in milliseconds: the size of each fixed step
   * `consumeFixedStep` takes. Defaults to `1000 / 60`.
   * @returns The fixed delta time in milliseconds.
   */
  get fixedDeltaTimeInMilliseconds(): number {
    return this._fixedDeltaTimeInMilliseconds;
  }

  /**
   * Sets the fixed delta time in milliseconds. The time already accumulated
   * is kept, and the next fixed step `consumeFixedStep` takes uses the new
   * size. A fixed step that's running keeps its size.
   * @param value - The new fixed delta time in milliseconds.
   * @throws An error if the value isn't finite and greater than `0`.
   */
  set fixedDeltaTimeInMilliseconds(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(
        `Unable to set the fixed delta time to "${value}" milliseconds, it must be finite and greater than 0.`,
      );
    }

    this._fixedDeltaTimeInMilliseconds = value;
  }

  /**
   * Gets the fixed delta time in seconds: the size of each fixed step
   * `consumeFixedStep` takes. Defaults to `1 / 60`.
   * @returns The fixed delta time in seconds.
   */
  get fixedDeltaTimeInSeconds(): number {
    return this._fixedDeltaTimeInMilliseconds / 1000;
  }

  /**
   * Gets whether a fixed step is running: `true` from when `consumeFixedStep`
   * returns `true` until it returns `false`. While it's `true`, the delta time
   * and time getters report the fixed clock.
   * @returns Whether a fixed step is running.
   */
  get isInFixedStep(): boolean {
    return this._isInFixedStep;
  }

  /**
   * Gets the fixed overstep fraction: the time accumulated towards the next
   * fixed step, as a fraction of the fixed delta time. Once `consumeFixedStep`
   * has returned `false`, it's at least `0` and less than `1`, and it's the
   * factor to interpolate rendering by, between the previous and the latest
   * fixed step.
   * @returns The fixed overstep fraction.
   */
  get fixedOverstepFraction(): number {
    return (
      this._fixedAccumulatorInMilliseconds / this._fixedDeltaTimeInMilliseconds
    );
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
   * Updates the time-related information and adds the frame's delta time to
   * the time accumulated towards fixed steps. `Game` calls it once per frame,
   * before updating its worlds.
   * @param time - The current time in milliseconds, such as
   * `performance.now()`.
   * @throws An error if a fixed step is running, because `consumeFixedStep`
   * wasn't called until it returned `false`.
   */
  public update(time: number): void {
    if (this._isInFixedStep) {
      throw new Error(
        'Unable to update the time while a fixed step is running, call "consumeFixedStep" until it returns false before the next update.',
      );
    }

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

    // The first delta is the clock's offset from its epoch, not elapsed time,
    // and would run thousands of fixed steps at once. Starting the fixed time
    // at the frame's time instead keeps the fixed time plus the accumulated
    // time equal to the frame's time, so the time getters don't jump when a
    // fixed step starts or ends.
    if (isFirstUpdate) {
      this._fixedTimeInMilliseconds = this._timeInMilliseconds;
    } else {
      this._fixedAccumulatorInMilliseconds += this._deltaTimeInMilliseconds;
    }

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
   * Takes one fixed step from the accumulated time, if it holds enough for
   * one. Call it in a loop after each `update` and do the fixed-rate work
   * once per step: `while (time.consumeFixedStep()) { ... }`.
   *
   * When the accumulated time holds at least `fixedDeltaTimeInMilliseconds`,
   * it subtracts one fixed delta time, advances the fixed time by it, starts
   * a fixed step (`isInFixedStep` becomes `true`) and returns `true`.
   * Otherwise it ends the fixed step and returns `false`, and the rest stays
   * accumulated for the next frame.
   * @returns `true` if a fixed step was taken, `false` otherwise.
   */
  public consumeFixedStep(): boolean {
    if (
      this._fixedAccumulatorInMilliseconds < this._fixedDeltaTimeInMilliseconds
    ) {
      this._isInFixedStep = false;

      return false;
    }

    this._fixedStepDeltaTimeInMilliseconds = this._fixedDeltaTimeInMilliseconds;
    this._fixedAccumulatorInMilliseconds -=
      this._fixedStepDeltaTimeInMilliseconds;
    this._fixedTimeInMilliseconds += this._fixedStepDeltaTimeInMilliseconds;
    this._isInFixedStep = true;

    return true;
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
