import { createComponentId } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';

/**
 * The snake's logical grid state, read and written by
 * `createSnakeTurnEcsSystem`, `createSnakeMovementEcsSystem` and
 * `createSnakeRenderSyncEcsSystem`. Held by a single, non-visual "snake"
 * entity; the segments and pellet themselves are separate sprite entities,
 * referenced here by id so the render-sync system can reposition and
 * re-tint them each tick.
 */
export interface SnakeEcsComponent {
  /** Grid positions of every segment, head first (index 0). */
  segments: Vector2[];

  /** Sprite entity ids for each segment, in the same order as `segments`. */
  segmentEntities: number[];

  /** Index into `directions` (`_grid.ts`) the snake is currently moving in. */
  directionIndex: number;

  /** The `Time.timeInSeconds` value at which the snake next moves one cell. */
  nextMoveTime: number;

  /** The pellet's sprite entity id. */
  pelletEntity: number;

  /** The pellet's current grid position. */
  pelletGridPosition: Vector2;
}

export const snakeId = createComponentId<SnakeEcsComponent>('snake');
