import { Stoppable, Time } from '../common/index.js';
import { EcsWorld } from '../new-ecs/ecs-world.js';

/**
 * Manages the game loop and coordinates updates between systems.
 */
export class Game implements Stoppable {
  private _isRunning = false;
  private _animationFrameId: number | null = null;

  private readonly _time: Time;
  private readonly _world: EcsWorld;
  public readonly container: HTMLElement;

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
    this._gameLoop(performance.now());
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
  }

  private readonly _gameLoop = (currentTime: number): void => {
    if (!this._isRunning) {
      return;
    }

    this._time.update(currentTime);
    this._world.update();

    this._animationFrameId = requestAnimationFrame(this._gameLoop);
  };
}
