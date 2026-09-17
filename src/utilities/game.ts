import { Resizable, Stoppable, Time, World } from '../common/index.js';

/**
 * Manages the game loop and coordinates updates between systems.
 */
export class Game implements Stoppable {
  /**
   * The HTML element that contains the game canvas.
   */
  public readonly container: HTMLElement;
  private _isRunning = false;
  private _animationFrameId: number | null = null;
  private _resizeObserver: ResizeObserver | null = null;

  private readonly _time: Time;
  private readonly _worlds: readonly World[];
  private readonly _resizables: readonly Resizable[];

  /**
   * Creates a new Game instance.
   * @param time - The Time instance for managing time-related operations.
   * @param worlds - The worlds (e.g. `EcsWorld` instances) to update once per frame and stop when the game stops. A game can drive more than one, e.g. a gameplay world alongside a separate UI overlay world.
   * @param container - The HTML element that contains the game canvas.
   * @param resizables - The resizable objects (e.g. `RenderContext` instances) whose canvases should be kept in sync with `container`'s size while the game is running. Omit if the game has nothing to resize.
   */
  constructor(
    time: Time,
    worlds: readonly World[],
    container: HTMLElement,
    resizables: readonly Resizable[] = [],
  ) {
    this._time = time;
    this._worlds = worlds;
    this.container = container;
    this._resizables = resizables;
  }

  /**
   * Starts the game loop.
   */
  public run(): void {
    if (this._isRunning) {
      return;
    }

    this._isRunning = true;

    // Seed the time tracker with the current time so the first frame's
    // delta time reflects the time since `run()` was called, rather than
    // the time since the page loaded. Without this, navigating to a game
    // client-side (e.g. via SPA routing) long after the page first loaded
    // produces a huge first-frame delta time, which can cause a single,
    // massive integration step (e.g. physics bodies tunnelling through
    // boundaries).
    this._time.update(performance.now());

    if (this._resizables.length > 0) {
      const resizables = this._resizables;

      // Deferred to the next frame rather than resizing synchronously in
      // the observer callback: mutating the canvas's size in direct
      // response to a ResizeObserver notification is exactly the pattern
      // that trips the browser's "ResizeObserver loop completed with
      // undelivered notifications" error, since it can itself affect layout
      // before the browser has finished notifying every observer for this
      // cycle.
      this._resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          this._resizeToContainer(resizables);
        });
      });
      this._resizeObserver.observe(this.container);
    }

    this._animationFrameId = requestAnimationFrame(this._gameLoop);
  }

  /**
   * Stops the game loop.
   */
  public stop(): void {
    this._isRunning = false;

    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    for (const world of this._worlds) {
      world.stop();
    }
  }

  /**
   * Resizes every resizable to match `container`'s current size, so each
   * canvas (and anything derived from its width/height, such as a camera's
   * projection matrix) follows the container instead of staying pinned to
   * whatever size it had when the game started. Skips a momentarily
   * zero-sized container (e.g. `display: none` mid-reflow), since a
   * resizable's `resize` typically requires positive dimensions.
   * @param resizables - The resizables to resize.
   */
  private _resizeToContainer(resizables: readonly Resizable[]): void {
    const { clientWidth, clientHeight } = this.container;

    if (clientWidth <= 0 || clientHeight <= 0) {
      return;
    }

    for (const resizable of resizables) {
      if (
        resizable.width === clientWidth &&
        resizable.height === clientHeight
      ) {
        continue;
      }

      resizable.resize(clientWidth, clientHeight);
    }
  }

  private readonly _gameLoop = (): void => {
    if (!this._isRunning) {
      return;
    }

    // Use our own `performance.now()` reading taken at the point this
    // callback actually executes, rather than the timestamp
    // `requestAnimationFrame` passes in. That timestamp isn't guaranteed to
    // be monotonic relative to a prior `performance.now()` call - it can
    // reflect when the browser decided to start the frame rather than when
    // the callback ran, which occasionally lands slightly before the
    // previous tick's recorded time (e.g. right after a heavy synchronous
    // block) and produces a negative delta. Reading our own clock here
    // keeps every delta relative to the same monotonic source.
    this._time.update(performance.now());

    for (const world of this._worlds) {
      world.update(this._time.deltaTimeInMilliseconds);
    }

    this._animationFrameId = requestAnimationFrame(this._gameLoop);
  };
}
