import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Random } from '@forge-game-engine/forge/math';
import { RenderContext, SpriteEcsComponent } from '@forge-game-engine/forge/rendering';
import {
  directions,
  gridToScreen,
  MOVE_INTERVAL_SECONDS,
  randomFreeCell,
  wrapGridPosition,
} from './_grid';
import { SnakeGameController } from './_snake-controller';
import { SnakeEcsComponent, snakeId } from './_snake.component';
import {
  createSquareEntity,
  drawLayers,
  SEGMENT_SIZE,
  snakeColors,
  spawnSnakeAndPellet,
} from './_spawn-snake';

/**
 * Advances the snake one grid cell every `MOVE_INTERVAL_SECONDS`: wraps
 * around the board edges, detects self-collision (starting a new snake) and
 * eating the pellet (growing and placing a new pellet), and notifies
 * `controller` so the DOM overlay can show the snake's length and a "NOM!"
 * moment.
 *
 * This system only updates the snake's logical grid state
 * (`SnakeEcsComponent.segments`/`pelletGridPosition`) — it doesn't touch
 * any `PositionEcsComponent` or `SpriteEcsComponent` itself.
 * `createSnakeRenderSyncEcsSystem` is what applies that state to the
 * sprites every tick, so this system stays a pure simulation step.
 * @param time - The time instance used to throttle movement to a fixed interval.
 * @param random - The random instance used to place new pellets.
 * @param renderContext - The render context, used to convert grid positions to screen positions for `controller`.
 * @param controller - The controller the demo's React UI reads length/nom/game-over notifications from.
 * @param entitySprite - The base square sprite new segments are cloned from when growing, and every segment/pellet are cloned from when a new snake spawns after a collision.
 */
export const createSnakeMovementEcsSystem = (
  time: Time,
  random: Random,
  renderContext: RenderContext,
  controller: SnakeGameController,
  entitySprite: SpriteEcsComponent,
): EcsSystem<[SnakeEcsComponent]> => ({
  query: [snakeId],
  run: (result, world) => {
    const [snake] = result.components;

    if (time.timeInSeconds < snake.nextMoveTime) {
      return;
    }

    snake.nextMoveTime = time.timeInSeconds + MOVE_INTERVAL_SECONDS;

    const currentHeadGridPosition = snake.segments[0];
    const newHeadGridPosition = wrapGridPosition(
      currentHeadGridPosition.add(directions[snake.directionIndex]),
    );

    const ateFood = newHeadGridPosition.equals(snake.pelletGridPosition);
    const collisionCandidates = ateFood
      ? snake.segments
      : snake.segments.slice(0, -1);
    const selfCollision = collisionCandidates.some((segment) =>
      segment.equals(newHeadGridPosition),
    );

    if (selfCollision) {
      for (const entity of snake.segmentEntities) {
        world.removeEntity(entity);
      }

      world.removeEntity(snake.pelletEntity);

      controller.onGameOver.raise(
        gridToScreen(
          currentHeadGridPosition,
          renderContext.width,
          renderContext.height,
        ),
      );

      Object.assign(snake, spawnSnakeAndPellet(world, entitySprite, random));
      controller.onLengthChanged.raise(snake.segments.length);

      return;
    }

    if (ateFood) {
      const newSegmentEntity = createSquareEntity(
        world,
        entitySprite,
        newHeadGridPosition,
        SEGMENT_SIZE,
        snakeColors.body,
        drawLayers.entities,
      );

      snake.segments.unshift(newHeadGridPosition);
      snake.segmentEntities.unshift(newSegmentEntity);
      snake.pelletGridPosition = randomFreeCell(random, snake.segments);

      controller.onLengthChanged.raise(snake.segments.length);
      controller.onNom.raise(
        gridToScreen(
          newHeadGridPosition,
          renderContext.width,
          renderContext.height,
        ),
      );
    } else {
      snake.segments.pop();
      snake.segments.unshift(newHeadGridPosition);
      snake.segmentEntities.unshift(snake.segmentEntities.pop()!);
    }
  },
});
