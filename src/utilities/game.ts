import { Stoppable, Time } from '../common/index.js';
import { EcsWorld } from '../ecs/ecs-world.js';

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

  private readonly _time: Time;
  private readonly _world: EcsWorld;

  /**
   * Creates a new Game instance.
   * @param time - The Time instance for managing time-related operations.
   * @param world - The ECS world containing all entities and systems.
   * @param container - The HTML element that contains the game canvas.
   */
  constructor(time: Time, world: EcsWorld, container: HTMLElement) {
    this._time = time;
    this._world = world;
    this.container = container;
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

    this._world.stop();
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
