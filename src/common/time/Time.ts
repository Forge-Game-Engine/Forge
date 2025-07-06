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
   * Gets the number of frames.
   * @returns The number of frames.
   */
  get frames(): number {
    return this._frames;
  }

  /**
   * Gets the raw time in milliseconds.
   * @returns The raw time in milliseconds.
   */
  get rawTimeInMilliseconds(): number {
    return this._rawTimeInMilliseconds;
  }

  /**
   * Gets the raw delta time in milliseconds.
   * @returns The raw delta time in milliseconds.
   */
  get rawDeltaTimeInMilliseconds(): number {
    return this._rawDeltaTimeInMilliseconds;
  }

  /**
   * Gets the delta time in milliseconds.
   * @returns The delta time in milliseconds.
   */
  get deltaTimeInMilliseconds(): number {
    return this._deltaTimeInMilliseconds;
  }

  /**
   * Gets the time in milliseconds.
   * @returns The time in milliseconds.
   */
  get timeInMilliseconds(): number {
    return this._timeInMilliseconds;
  }

  /**
   * Gets the previous time in milliseconds.
   * @returns The previous time in milliseconds.
   */
  get previousTimeInMilliseconds(): number {
    return this._previousTimeInMilliseconds;
  }

  /**
   * Gets the raw time in seconds.
   * @returns The raw time in seconds.
   */
  get rawTimeInSeconds(): number {
    return this._rawTimeInSeconds;
  }

  /**
   * Gets the raw delta time in seconds.
   * @returns The raw delta time in seconds.
   */
  get rawDeltaTimeInSeconds(): number {
    return this._rawDeltaTimeInSeconds;
  }

  /**
   * Gets the delta time in seconds.
   * @returns The delta time in seconds.
   */
  get deltaTimeInSeconds(): number {
    return this._deltaTimeInSeconds;
  }

  /**
   * Gets the time in seconds.
   * @returns The time in seconds.
   */
  get timeInSeconds(): number {
    return this._timeInSeconds;
  }

  /**
   * Gets the previous time in seconds.
   * @returns The previous time in seconds.
   */
  get previousTimeInSeconds(): number {
    return this._previousTimeInSeconds;
  }

  /**
   * Gets the time scale.
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
   * Gets the times array.
   * @returns The times array.
   */
  get times(): number[] {
    return this._times;
  }

  /**
   * Updates the time-related information.
   * @param time - The current time.
   */
  public update(time: number) {
    this._frames++;

    this._previousTimeInMilliseconds = this._rawTimeInMilliseconds;
    this._rawTimeInMilliseconds = time;
    this._rawDeltaTimeInMilliseconds = time - this._previousTimeInMilliseconds;
    this._deltaTimeInMilliseconds =
      this._rawDeltaTimeInMilliseconds * this._timeScale;
    this._timeInMilliseconds =
      this._timeInMilliseconds + this._deltaTimeInMilliseconds;

    this._previousTimeInSeconds = this._rawTimeInSeconds;
    this._rawTimeInSeconds = time / 1000;
    this._rawDeltaTimeInSeconds = time / 1000 - this._previousTimeInSeconds;
    this._deltaTimeInSeconds = this._rawDeltaTimeInSeconds * this._timeScale;
    this._timeInSeconds = this._timeInSeconds + this._deltaTimeInSeconds;

    while (this._times.length > 0 && this._times[0] <= time - 1000) {
      this._times.shift();
    }

    this._times.push(time);
  }

  /**
   * Gets the current frames per second (FPS).
   * @returns The current FPS.
   */
  get fps(): number {
    return this._times.length;
  }
}
