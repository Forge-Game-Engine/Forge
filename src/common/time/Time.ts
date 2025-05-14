/**
 * Class to manage and track time-related information.
 */
export class Time {
  private _frames: number;
  private _rawTime: number;
  private _rawDeltaTime: number;
  private _deltaTime: number;
  private _time: number;
  private _previousTime: number;
  private _timeScale: number;
  private _times: number[];

  /**
   * Creates an instance of Time.
   */
  constructor() {
    this._frames = 0;
    this._rawTime = 0;
    this._rawDeltaTime = 0;
    this._deltaTime = 0;
    this._time = 0;
    this._previousTime = 0;
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
   * Gets the raw time.
   * @returns The raw time.
   */
  get rawTime(): number {
    return this._rawTime;
  }

  /**
   * Gets the raw delta time.
   * @returns The raw delta time.
   */
  get rawDeltaTime(): number {
    return this._rawDeltaTime;
  }

  /**
   * Gets the delta time.
   * @returns The delta time.
   */
  get deltaTime(): number {
    return this._deltaTime;
  }

  /**
   * Gets the time.
   * @returns The time.
   */
  get time(): number {
    return this._time;
  }

  /**
   * Gets the previous time.
   * @returns The previous time.
   */
  get previousTime(): number {
    return this._previousTime;
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
    this._previousTime = this._rawTime;
    this._rawTime = time;
    this._rawDeltaTime = time - this._previousTime;
    this._deltaTime = this._rawDeltaTime * this._timeScale;
    this._time = this._time + this._deltaTime;

    while (this._times.length > 0 && this._times[0]! <= time - 1000) {
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
