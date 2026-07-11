import { positionId } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Random, Vector2 } from '@forge-game-engine/forge/math';
import { Color, spriteId, SpriteEcsComponent } from '@forge-game-engine/forge/rendering';
import { CELL_SIZE, gridToWorld, INITIAL_SNAKE_LENGTH, GRID_COLUMNS, GRID_ROWS, randomFreeCell } from './_grid';
import { SnakeEcsComponent } from './_snake.component';

export const snakeColors = {
  boardBorder: Color.fromHSLA(140, 40, 34),
  board: Color.fromHSLA(140, 24, 16),
  body: Color.fromHSLA(140, 55, 42),
  head: Color.fromHSLA(140, 85, 62),
  pellet: Color.fromHSLA(4, 80, 58),
};

/** How much wider/taller the board border is than the board fill, in world units, on each side. */
export const BOARD_BORDER_THICKNESS = 4;

/** A segment's width/height, in world units. Smaller than `CELL_SIZE` so a grid gap is visible between adjacent segments. */
export const SEGMENT_SIZE = CELL_SIZE * 0.85;

/** The pellet's width/height, in world units. */
export const PELLET_SIZE = CELL_SIZE * 0.6;

/**
 * Draw-order layers for `SpriteEcsComponent.layer` (lower draws first, so
 * higher layers appear on top): the border sits behind the board fill,
 * which sits behind every segment and the pellet. `createImageSprite`
 * always returns `layer: 0`, so every entity built from a shared base
 * sprite must set this explicitly rather than relying on the base sprite's
 * default.
 */
export const drawLayers = {
  boardBorder: 0,
  board: 1,
  entities: 2,
};

/**
 * Creates a single square sprite entity at a grid position, cloning the
 * given base sprite so it shares its `renderable` (and batches with every
 * other entity built from the same base sprite) while getting its own
 * size, tint and draw-order layer.
 * @param world - The ECS world to add the entity to.
 * @param squareSprite - The base square sprite to clone.
 * @param gridPosition - The grid position to place the entity at.
 * @param size - The entity's width and height, in world units.
 * @param tintColor - The entity's tint color.
 * @param layer - The entity's draw-order layer, from `drawLayers`.
 * @returns The created entity's id.
 */
export function createSquareEntity(
  world: EcsWorld,
  squareSprite: SpriteEcsComponent,
  gridPosition: Vector2,
  size: number,
  tintColor: Color,
  layer: number,
): number {
  const entity = world.createEntity();
  const worldPosition = gridToWorld(gridPosition);

  world.addComponent(entity, spriteId, {
    ...squareSprite,
    width: size,
    height: size,
    tintColor,
    layer,
  });

  world.addComponent(entity, positionId, {
    local: worldPosition.clone(),
    world: worldPosition.clone(),
  });

  return entity;
}

/**
 * Builds a fresh snake (`INITIAL_SNAKE_LENGTH` segments, centered on the
 * board, facing up) and its first pellet. Used both to start the game and
 * to respawn after a self-collision.
 * @param world - The ECS world to add the segment and pellet entities to.
 * @param entitySprite - The base square sprite segments and the pellet are cloned from.
 * @param random - The random instance used to place the pellet.
 * @returns The initial state for a `SnakeEcsComponent`.
 */
export function spawnSnakeAndPellet(
  world: EcsWorld,
  entitySprite: SpriteEcsComponent,
  random: Random,
): Pick<
  SnakeEcsComponent,
  | 'segments'
  | 'segmentEntities'
  | 'directionIndex'
  | 'pelletEntity'
  | 'pelletGridPosition'
> {
  const centerX = Math.floor(GRID_COLUMNS / 2);
  const centerY = Math.floor(GRID_ROWS / 2);

  const segments: Vector2[] = [];
  const segmentEntities: number[] = [];

  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    const gridPosition = new Vector2(centerX, centerY + i);

    segments.push(gridPosition);
    segmentEntities.push(
      createSquareEntity(
        world,
        entitySprite,
        gridPosition,
        SEGMENT_SIZE,
        i === 0 ? snakeColors.head : snakeColors.body,
        drawLayers.entities,
      ),
    );
  }

  const pelletGridPosition = randomFreeCell(random, segments);
  const pelletEntity = createSquareEntity(
    world,
    entitySprite,
    pelletGridPosition,
    PELLET_SIZE,
    snakeColors.pellet,
    drawLayers.entities,
  );

  return {
    segments,
    segmentEntities,
    directionIndex: 0,
    pelletEntity,
    pelletGridPosition,
  };
}
