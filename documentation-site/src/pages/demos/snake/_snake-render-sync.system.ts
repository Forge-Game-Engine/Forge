import { PositionEcsComponent, positionId } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { spriteId, SpriteEcsComponent } from '@forge-game-engine/forge/rendering';
import { gridToWorld } from './_grid';
import { SnakeEcsComponent, snakeId } from './_snake.component';
import { snakeColors } from './_spawn-snake';

/**
 * Keeps every segment's and the pellet's `PositionEcsComponent` (and each
 * segment's tint, so the head stays visually distinct from the body) in
 * sync with the snake's logical grid state.
 *
 * Runs every tick, independent of `createSnakeMovementEcsSystem`'s move
 * timing, so it always reflects the latest state — including a collision
 * reset or a grown segment from the same tick — rather than lagging a
 * frame behind. This is the only system that writes rendering components;
 * `createSnakeMovementEcsSystem` only ever updates `SnakeEcsComponent`.
 */
export const createSnakeRenderSyncEcsSystem = (): EcsSystem<
  [SnakeEcsComponent]
> => ({
  query: [snakeId],
  run: (result, world) => {
    const [snake] = result.components;

    for (let i = 0; i < snake.segments.length; i++) {
      const segmentWorldPosition = gridToWorld(snake.segments[i]);

      const position = world.getComponent<PositionEcsComponent>(
        snake.segmentEntities[i],
        positionId,
      )!;

      position.local.set(segmentWorldPosition);
      position.world.set(segmentWorldPosition);

      const sprite = world.getComponent<SpriteEcsComponent>(
        snake.segmentEntities[i],
        spriteId,
      )!;

      sprite.tintColor = i === 0 ? snakeColors.head : snakeColors.body;
    }

    const pelletWorldPosition = gridToWorld(snake.pelletGridPosition);
    const pelletPosition = world.getComponent<PositionEcsComponent>(
      snake.pelletEntity,
      positionId,
    )!;

    pelletPosition.local.set(pelletWorldPosition);
    pelletPosition.world.set(pelletWorldPosition);
  },
});
