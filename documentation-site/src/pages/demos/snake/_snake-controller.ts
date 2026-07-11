import { ParameterizedForgeEvent } from '@forge-game-engine/forge/events';
import { Vector2 } from '@forge-game-engine/forge/math';

/**
 * Bridges the snake game's ECS systems and the demo page's React UI.
 *
 * React reads and controls the game through this instead of touching the
 * `EcsWorld` directly: the direction buttons queue turns via
 * `turnClockwise`/`turnAntiClockwise`, and the game reports the snake's
 * length and floating-text moments (eating a pellet, colliding with itself)
 * back out through its events, so the DOM overlay can stay in sync with
 * gameplay it doesn't otherwise have visibility into.
 */
export class SnakeGameController {
  /** Raised whenever the snake's length changes, with the new length. */
  public readonly onLengthChanged = new ParameterizedForgeEvent<number>(
    'snakeLengthChanged',
  );

  /** Raised when the snake eats a pellet, with the head's screen position. */
  public readonly onNom = new ParameterizedForgeEvent<Vector2>('snakeNom');

  /** Raised when the snake collides with itself, with the head's screen position. */
  public readonly onGameOver = new ParameterizedForgeEvent<Vector2>(
    'snakeGameOver',
  );

  private readonly _pendingTurns: number[] = [];

  /** Queues a 90-degree clockwise turn, applied on the snake's next move. */
  public turnClockwise(): void {
    this._pendingTurns.push(1);
  }

  /** Queues a 90-degree anti-clockwise turn, applied on the snake's next move. */
  public turnAntiClockwise(): void {
    this._pendingTurns.push(-1);
  }

  /**
   * Consumes the oldest queued turn, if any. Only one turn is applied per
   * move so that mashing both buttons within a single move interval can't
   * reverse the snake directly into its own neck.
   * @returns `1` for clockwise, `-1` for anti-clockwise, or `0` if no turn is queued.
   */
  public consumePendingTurn(): number {
    return this._pendingTurns.shift() ?? 0;
  }
}
