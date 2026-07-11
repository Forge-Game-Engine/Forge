import { positionId } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Random, Vector2 } from '@forge-game-engine/forge/math';
import {
  RenderContext,
  spriteId,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { createSquareSprite } from './_create-square-sprite';
import { CELL_SIZE, gridToWorld, GRID_COLUMNS, GRID_ROWS } from './_grid';
import {
  BOARD_BORDER_THICKNESS,
  drawLayers,
  snakeColors,
  spawnSnakeAndPellet,
} from './_spawn-snake';
import { snakeId } from './_snake.component';

/**
 * Culling categories for `createSquareSprite`'s `layer` argument, which
 * `createImageSprite` stores as `Renderable.category` — matched against a
 * camera's `cullingMask` via a non-zero bitwise AND (`matchesMask`), *not*
 * used for draw order. A category of `0` would never pass that check
 * against any mask, so unlike `drawLayers` (`_spawn-snake.ts`) these must
 * always be non-zero bit flags, following the `1 << n` convention used
 * elsewhere in the docs (e.g. the brick-breaker demo's `renderLayers`).
 * This demo's single camera has the default (match-everything)
 * `cullingMask`, so board and entities could share one category — kept
 * separate here to mirror that established convention.
 */
const cullingCategories = {
  board: 1 << 0,
  entities: 1 << 1,
};

/**
 * Creates the board background and the snake's initial segments and
 * pellet, and registers the `SnakeEcsComponent` that `createSnakeEcsSystem`
 * drives every tick.
 * @param world - The ECS world to add entities to.
 * @param renderContext - The render context used to build sprites.
 * @param random - The random instance used to place the first pellet.
 * @returns The base square sprite used for segments and the pellet, so the
 * movement system can clone it again when spawning a new snake after a collision.
 */
export async function createSnake(
  world: EcsWorld,
  renderContext: RenderContext,
  random: Random,
): Promise<SpriteEcsComponent> {
  const boardSprite = await createSquareSprite(
    renderContext,
    cullingCategories.board,
  );
  const entitySprite = await createSquareSprite(
    renderContext,
    cullingCategories.entities,
  );

  const boardBorderEntity = world.createEntity();

  world.addComponent(boardBorderEntity, spriteId, {
    ...boardSprite,
    width: GRID_COLUMNS * CELL_SIZE + BOARD_BORDER_THICKNESS * 2,
    height: GRID_ROWS * CELL_SIZE + BOARD_BORDER_THICKNESS * 2,
    tintColor: snakeColors.boardBorder,
    layer: drawLayers.boardBorder,
  });

  world.addComponent(boardBorderEntity, positionId, {
    local: Vector2.zero,
    world: Vector2.zero,
  });

  // The fill is tiled per grid cell, rather than one quad spanning the
  // whole board, so no single quad is large enough for the seam some GPUs
  // render along a quad's internal diagonal (between its two triangles) to
  // be visible — the same reason it's never been noticeable on the
  // similarly-sized snake segments or pellet.
  for (let gridX = 0; gridX < GRID_COLUMNS; gridX++) {
    for (let gridY = 0; gridY < GRID_ROWS; gridY++) {
      const tileEntity = world.createEntity();
      const tileWorldPosition = gridToWorld(new Vector2(gridX, gridY));

      world.addComponent(tileEntity, spriteId, {
        ...boardSprite,
        width: CELL_SIZE,
        height: CELL_SIZE,
        tintColor: snakeColors.board,
        layer: drawLayers.board,
      });

      world.addComponent(tileEntity, positionId, {
        local: tileWorldPosition.clone(),
        world: tileWorldPosition.clone(),
      });
    }
  }

  const snakeEntity = world.createEntity();

  world.addComponent(snakeEntity, snakeId, {
    ...spawnSnakeAndPellet(world, entitySprite, random),
    nextMoveTime: 0,
  });

  return entitySprite;
}
