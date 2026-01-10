import { Stoppable, Time } from '../common/index.js';
import { EcsWorld } from '../new-ecs/ecs-world.js';

/**
 * Manages the game loop and coordinates updates between systems.
 */
export class Game implements Stoppable {
  private _isRunning = false;
  private _animationFrameId: number | null = null;

  /**
   * Creates a new Game instance.
   * @param time - The Time instance for managing time-related operations.
   * @param world - The ECS world containing all entities and systems.
   * @param container - The HTML element that contains the game canvas.
   */
  constructor(
    public readonly time: Time,
    public readonly world: EcsWorld,
    public readonly container: HTMLElement,
  ) {}

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

  private _gameLoop = (currentTime: number): void => {
    if (!this._isRunning) {
      return;
    }

    this.time.update(currentTime);
    this.world.update();

    this._animationFrameId = requestAnimationFrame(this._gameLoop);
  };
}
