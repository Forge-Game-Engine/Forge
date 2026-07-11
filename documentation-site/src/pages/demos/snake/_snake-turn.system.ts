import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { directions } from './_grid';
import { SnakeGameController } from './_snake-controller';
import { SnakeEcsComponent, snakeId } from './_snake.component';

/**
 * Applies at most one queued turn (from the demo's direction buttons) to the
 * snake's `directionIndex`, once per move interval rather than once per
 * frame — otherwise mashing both buttons within a single interval could
 * drain two turns before the snake next moves, spinning it 180 degrees and
 * reversing it into its own neck. Registered before
 * `createSnakeMovementEcsSystem`, so the move that follows in the same tick
 * already sees the updated direction.
 * @param time - The time instance used to check whether a move (and so a turn) is due this tick.
 * @param controller - The controller the demo's direction buttons queue turns on.
 */
export const createSnakeTurnEcsSystem = (
  time: Time,
  controller: SnakeGameController,
): EcsSystem<[SnakeEcsComponent]> => ({
  query: [snakeId],
  run: (result) => {
    const [snake] = result.components;

    if (time.timeInSeconds < snake.nextMoveTime) {
      return;
    }

    const turn = controller.consumePendingTurn();

    if (turn !== 0) {
      snake.directionIndex =
        (snake.directionIndex + turn + directions.length) % directions.length;
    }
  },
});
