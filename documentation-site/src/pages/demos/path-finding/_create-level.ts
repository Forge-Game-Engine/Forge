import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { createTagId, EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  createOrthogonalGridLayout,
  Vector2,
} from '@forge-game-engine/forge/math';
import {
  createNavigationGrid,
  NavigationGrid,
} from '@forge-game-engine/forge/navigation';
import {
  addColliderComponent,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  addVisibilityComponent,
  Color,
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';

/** The size of a grid cell, in world units. */
export const cellSize = 20;

/** The level is this many cells across and down, border included. */
const columns = 42;
const rows = 26;

/** The world position of the level's top-left corner, centring it. */
const origin: Vector2 = {
  x: (-columns * cellSize) / 2,
  y: (-rows * cellSize) / 2,
};

/** Marks the walls the mouse can drag. */
export const draggableWallId = createTagId('draggable-wall');

/** A wall as a block of cells: its first column and row, and its size. */
interface WallCells {
  column: number;
  row: number;
  columns: number;
  rows: number;
}

/** The walls inside the border, which can be dragged. */
const innerWalls: WallCells[] = [
  { column: 9, row: 1, columns: 2, rows: 16 },
  { column: 19, row: 9, columns: 2, rows: 16 },
  { column: 29, row: 1, columns: 2, rows: 16 },
  { column: 33, row: 18, columns: 4, rows: 3 },
  { column: 3, row: 18, columns: 3, rows: 3 },
];

/** The level's border, one cell thick. */
const borderWalls: WallCells[] = [
  { column: 0, row: 0, columns, rows: 1 },
  { column: 0, row: rows - 1, columns, rows: 1 },
  { column: 0, row: 1, columns: 1, rows: rows - 2 },
  { column: columns - 1, row: 1, columns: 1, rows: rows - 2 },
];

const borderColor = new Color(0.22, 0.24, 0.3, 1);
const wallColor = new Color(0.45, 0.52, 0.66, 1);
const blockedCellColor = new Color(0.9, 0.25, 0.3, 0.35);

/**
 * Creates a wall: a box sprite and a box collider with no rigid body, so
 * physics treats it as static and `markGridFromColliders` bakes it.
 */
const createWall = (
  world: EcsWorld,
  renderContext: RenderContext,
  { column, row, columns: width, rows: height }: WallCells,
  color: Color,
): number => {
  const wall = world.createEntity();
  const halfWidth = (width * cellSize) / 2;
  const halfHeight = (height * cellSize) / 2;

  addPositionComponent(world, wall, {
    local: {
      x: origin.x + column * cellSize + halfWidth,
      y: origin.y + row * cellSize + halfHeight,
    },
  });
  addRotationComponent(world, wall);
  addSpriteComponent(world, wall, {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    width: halfWidth * 2,
    height: halfHeight * 2,
    tintColor: color,
  });
  addColliderComponent(world, wall, {
    collider: new PolygonCollider([
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight },
    ]),
    friction: 0,
    restitution: 0,
  });

  return wall;
};

/**
 * Creates one hidden, translucent sprite over each cell of the grid, which
 * the grid overlay system shows for blocked cells. They're created before
 * the walls, so the walls draw over them.
 */
const createCellOverlays = (
  world: EcsWorld,
  renderContext: RenderContext,
  grid: NavigationGrid,
): number[] => {
  const sprite = createImageSprite(renderContext.whiteTexture, {
    pixelsPerUnit: 1,
  });
  const overlays: number[] = [];

  for (let node = 0; node < grid.nodeCount; node++) {
    const { column, row } = grid.nodeToCell(node);
    const overlay = world.createEntity();

    addPositionComponent(world, overlay, {
      local: grid.cellToWorld(column, row),
    });
    addSpriteComponent(world, overlay, {
      ...sprite,
      width: cellSize - 2,
      height: cellSize - 2,
      tintColor: blockedCellColor,
    });
    addVisibilityComponent(world, overlay, { visible: false });
    overlays.push(overlay);
  }

  return overlays;
};

/** The level's grid, its cell overlays, and the area inside its border. */
export interface Level {
  grid: NavigationGrid;
  cellOverlays: number[];
  bounds: { min: Vector2; max: Vector2 };
}

/**
 * Creates the level: a navigation grid with one cell per 20 world units,
 * its blocked-cell overlay, the border and the walls inside it. The walls
 * inside are tagged as draggable. The grid starts with every cell walkable;
 * the bake grid system blocks the cells the walls cover.
 * @param world - The world to create the level in.
 * @param renderContext - The render context whose white texture the walls
 * and overlay are drawn with.
 * @returns The grid, the overlay's entities and the area inside the border.
 */
export function createLevel(
  world: EcsWorld,
  renderContext: RenderContext,
): Level {
  // The grid covers the whole level, border included, so cell (c, r) is
  // the c-th column and r-th row of cells from the level's top-left
  // corner.
  const grid = createNavigationGrid({
    cells: {
      minColumn: 0,
      minRow: 0,
      maxColumn: columns - 1,
      maxRow: rows - 1,
    },
    layout: createOrthogonalGridLayout({
      cellWidth: cellSize,
      cellHeight: cellSize,
    }),
    origin,
  });
  const cellOverlays = createCellOverlays(world, renderContext, grid);

  for (const wall of borderWalls) {
    createWall(world, renderContext, wall, borderColor);
  }

  for (const wall of innerWalls) {
    world.addTag(
      createWall(world, renderContext, wall, wallColor),
      draggableWallId,
    );
  }

  return {
    grid,
    cellOverlays,
    bounds: {
      min: { x: origin.x + cellSize, y: origin.y + cellSize },
      max: {
        x: origin.x + (columns - 1) * cellSize,
        y: origin.y + (rows - 1) * cellSize,
      },
    },
  };
}
