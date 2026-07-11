import { Random, Vector2 } from '@forge-game-engine/forge/math';

/** Number of grid cells spanning the board horizontally. */
export const GRID_COLUMNS = 17;

/** Number of grid cells spanning the board vertically. */
export const GRID_ROWS = 17;

/** The size, in world units (and pixels, at the demo's camera zoom), of a single grid cell. */
export const CELL_SIZE = 22;

/** How long the snake waits between moving one grid cell, in seconds. */
export const MOVE_INTERVAL_SECONDS = 0.15;

/** The number of segments the snake starts (and respawns) with. */
export const INITIAL_SNAKE_LENGTH = 3;

/**
 * The four grid-space movement directions, ordered clockwise starting from
 * up. Turning clockwise/anti-clockwise is just moving forward/backward
 * through this list.
 */
export const directions: readonly Vector2[] = [
  new Vector2(0, -1), // up
  new Vector2(1, 0), // right
  new Vector2(0, 1), // down
  new Vector2(-1, 0), // left
];

const wrap = (value: number, max: number): number => {
  return ((value % max) + max) % max;
};

/**
 * Wraps a grid position so it stays within the board, letting the snake
 * pass through one edge and reappear on the opposite one.
 * @param gridPosition - The grid position to wrap.
 * @returns A new, wrapped grid position.
 */
export function wrapGridPosition(gridPosition: Vector2): Vector2 {
  return new Vector2(
    wrap(gridPosition.x, GRID_COLUMNS),
    wrap(gridPosition.y, GRID_ROWS),
  );
}

/**
 * Converts a grid position to a world position, centering the grid on the
 * origin so it lines up with the demo's static, centered camera.
 * @param gridPosition - The grid position to convert.
 * @returns The equivalent world position, in world units.
 */
export function gridToWorld(gridPosition: Vector2): Vector2 {
  const worldX = (gridPosition.x - (GRID_COLUMNS - 1) / 2) * CELL_SIZE;
  const worldY = ((GRID_ROWS - 1) / 2 - gridPosition.y) * CELL_SIZE;

  return new Vector2(worldX, worldY);
}

/**
 * Converts a grid position to a screen (canvas-pixel) position, for
 * positioning HTML elements over the entity the grid position represents.
 * Mirrors the render system's own world-to-screen conversion for a static
 * camera at the origin: the canvas center, plus the world position with Y
 * flipped (world space is Y-up, screen space is Y-down).
 * @param gridPosition - The grid position to convert.
 * @param canvasWidth - The render context's current canvas width, in pixels.
 * @param canvasHeight - The render context's current canvas height, in pixels.
 * @returns The equivalent screen position, relative to the canvas's top-left corner.
 */
export function gridToScreen(
  gridPosition: Vector2,
  canvasWidth: number,
  canvasHeight: number,
): Vector2 {
  const worldPosition = gridToWorld(gridPosition);

  return new Vector2(
    canvasWidth / 2 + worldPosition.x,
    canvasHeight / 2 - worldPosition.y,
  );
}

/**
 * Picks a random grid cell that isn't in `occupied`.
 * @param random - The random instance to draw candidate cells from.
 * @param occupied - Grid positions that must be avoided.
 * @returns A free grid position.
 */
export function randomFreeCell(random: Random, occupied: Vector2[]): Vector2 {
  let candidate: Vector2;

  do {
    candidate = new Vector2(
      random.randomInt(0, GRID_COLUMNS - 1),
      random.randomInt(0, GRID_ROWS - 1),
    );
  } while (occupied.some((cell) => cell.equals(candidate)));

  return candidate;
}
