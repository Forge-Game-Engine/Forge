import { Stoppable, Time } from '../common/index.js';
import { EcsWorld } from '../ecs/ecs-world.js';
import { RenderContext } from '../rendering/index.js';

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
  private readonly _world: EcsWorld;
  private readonly _renderContext: RenderContext | undefined;

  /**
   * Creates a new Game instance.
   * @param time - The Time instance for managing time-related operations.
   * @param world - The ECS world containing all entities and systems.
   * @param container - The HTML element that contains the game canvas.
   * @param renderContext - The render context whose canvas should be kept in sync with `container`'s size while the game is running. Omit if the game has no rendering to resize.
   */
  constructor(
    time: Time,
    world: EcsWorld,
    container: HTMLElement,
    renderContext?: RenderContext,
  ) {
    this._time = time;
    this._world = world;
    this.container = container;
    this._renderContext = renderContext;
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

    if (this._renderContext) {
      const renderContext = this._renderContext;

      this._resizeObserver = new ResizeObserver(() => {
        this._resizeToContainer(renderContext);
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

    this._world.stop();
  }

  /**
   * Resizes `renderContext` to match `container`'s current size, so the
   * canvas (and anything derived from `RenderContext.width`/`height`, such
   * as the camera's projection matrix) follows the container instead of
   * staying pinned to whatever size it had when the game started. Skips a
   * momentarily zero-sized container (e.g. `display: none` mid-reflow),
   * since `RenderContext.resize` requires positive dimensions.
   * @param renderContext - The render context to resize.
   */
  private _resizeToContainer(renderContext: RenderContext): void {
    const { clientWidth, clientHeight } = this.container;

    if (clientWidth <= 0 || clientHeight <= 0) {
      return;
    }

    if (
      renderContext.width === clientWidth &&
      renderContext.height === clientHeight
    ) {
      return;
    }

    renderContext.resize(clientWidth, clientHeight);
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
    this._world.update();

    this._animationFrameId = requestAnimationFrame(this._gameLoop);
  };
}
