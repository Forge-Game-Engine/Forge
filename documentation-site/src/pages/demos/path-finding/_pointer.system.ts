import { positionId } from '@forge-game-engine/forge/common';
import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  HoldAction,
  MouseInputSource,
  TriggerAction,
} from '@forge-game-engine/forge/input';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  NavigationGrid,
  navigationAgentId,
} from '@forge-game-engine/forge/navigation';
import { Aabb, colliderId } from '@forge-game-engine/forge/physics';
import {
  getCameraView,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { cellSize, draggableWallId } from './_create-level';
import {
  PathFindingLevelEcsComponent,
  pathFindingLevelId,
} from './_level.component';

/** The inputs the pointer system reads. */
export interface PointerInputs {
  mouse: MouseInputSource;

  /** Triggered when the left button goes down. */
  pressInput: TriggerAction;

  /** Held while the left button is down. */
  holdInput: HoldAction;
}

const contains = ({ min, max }: Aabb, point: Vector2): boolean =>
  point.x >= min.x && point.x <= max.x && point.y >= min.y && point.y <= max.y;

const overlaps = (a: Aabb, b: Aabb): boolean =>
  a.min.x < b.max.x &&
  a.max.x > b.min.x &&
  a.min.y < b.max.y &&
  a.max.y > b.min.y;

/** The draggable wall under a world point, or `null`. */
const findWallAt = (world: EcsWorld, point: Vector2): number | null => {
  const { entities } = world.query([colliderId], [draggableWallId]);

  for (const wall of entities) {
    const collider = world.getComponent(wall, colliderId);

    if (collider && contains(collider.aabb, point)) {
      return wall;
    }
  }

  return null;
};

/**
 * The centres of the walkable cells nearest a point, nearest first. Each
 * is a cell apart from the others, wider than a unit, so units sent to
 * them can all stand still on their own target.
 */
const findNearestWalkableCells = (
  grid: NavigationGrid,
  point: Vector2,
  count: number,
): Vector2[] => {
  const centres: Vector2[] = [];

  for (let node = 0; node < grid.nodeCount; node++) {
    const { column, row } = grid.nodeToCell(node);

    if (grid.isWalkable(column, row)) {
      centres.push(grid.cellToWorld(column, row));
    }
  }

  const distance = (centre: Vector2): number =>
    Math.hypot(centre.x - point.x, centre.y - point.y);

  return centres.sort((a, b) => distance(a) - distance(b)).slice(0, count);
};

/**
 * Sends the units to the clicked point, each to its own walkable cell
 * nearest it, so they don't push each other off one point forever.
 */
const setTargets = (
  world: EcsWorld,
  level: PathFindingLevelEcsComponent,
  point: Vector2,
): void => {
  const targets = findNearestWalkableCells(
    level.grid,
    point,
    level.units.length,
  );

  for (const [i, unit] of level.units.entries()) {
    const agent = world.getComponent(unit, navigationAgentId);

    if (agent) {
      agent.target = targets[i] ?? null;
    }
  }
};

/**
 * Snaps a wall's centre so its edges lie on cell edges, and keeps it inside
 * the level's border.
 */
const snapWallCentre = (
  level: PathFindingLevelEcsComponent,
  centre: Vector2,
  halfSize: Vector2,
): Vector2 => {
  const { min, max } = level.bounds;
  const snapAxis = (
    value: number,
    half: number,
    low: number,
    high: number,
  ): number => {
    const edge = Math.round((value - half - low) / cellSize) * cellSize + low;

    return Math.min(Math.max(edge, low), high - half * 2) + half;
  };

  return {
    x: snapAxis(centre.x, halfSize.x, min.x, max.x),
    y: snapAxis(centre.y, halfSize.y, min.y, max.y),
  };
};

/**
 * Moves the dragged wall to follow the mouse, a whole cell at a time. The
 * grid is baked again each time the wall moves, unless the move would drop
 * the wall onto a unit, which it refuses.
 */
const dragWall = (
  world: EcsWorld,
  level: PathFindingLevelEcsComponent,
  wall: number,
  point: Vector2,
): void => {
  const position = world.getComponent(wall, positionId);
  const collider = world.getComponent(wall, colliderId);

  if (!position || !collider) {
    return;
  }

  // The wall isn't rotated, so its bounds are its box.
  const { aabb } = collider;
  const halfSize = {
    x: (aabb.max.x - aabb.min.x) / 2,
    y: (aabb.max.y - aabb.min.y) / 2,
  };
  const next = snapWallCentre(
    level,
    { x: point.x + level.grabOffset.x, y: point.y + level.grabOffset.y },
    halfSize,
  );

  if (next.x === position.local.x && next.y === position.local.y) {
    return;
  }

  const nextBounds: Aabb = {
    min: { x: next.x - halfSize.x, y: next.y - halfSize.y },
    max: { x: next.x + halfSize.x, y: next.y + halfSize.y },
  };

  for (const unit of level.units) {
    const unitCollider = world.getComponent(unit, colliderId);

    if (unitCollider && overlaps(unitCollider.aabb, nextBounds)) {
      return;
    }
  }

  position.local.x = next.x;
  position.local.y = next.y;
  level.wallsVersion++;
};

const updatePointer = (
  world: EcsWorld,
  renderContext: RenderContext,
  inputs: PointerInputs,
  level: PathFindingLevelEcsComponent,
): void => {
  const point = getCameraView(
    world,
    level.camera,
    renderContext,
  ).viewportToWorld(inputs.mouse.position);

  if (inputs.pressInput.isTriggered) {
    const wall = findWallAt(world, point);
    const wallPosition =
      wall === null ? null : world.getComponent(wall, positionId);

    if (wall === null || !wallPosition) {
      setTargets(world, level, point);

      return;
    }

    level.draggedWall = wall;
    level.grabOffset = {
      x: wallPosition.local.x - point.x,
      y: wallPosition.local.y - point.y,
    };
  }

  if (level.draggedWall === null) {
    return;
  }

  if (!inputs.holdInput.isHeld) {
    level.draggedWall = null;

    return;
  }

  dragWall(world, level, level.draggedWall, point);
};

/**
 * Creates the system that handles the mouse: a press on a draggable wall
 * picks it up and the wall follows the mouse until the button is released;
 * a press anywhere else sends the units there.
 *
 * Register it before `createTransformEcsSystem`, so a moved wall's
 * `position.world` is up to date when the grid is baked on the same tick.
 * @param renderContext - The render context whose canvas the mouse is over.
 * @param inputs - The mouse and its actions.
 * @returns The ECS system.
 */
export const createPointerEcsSystem = (
  renderContext: RenderContext,
  inputs: PointerInputs,
): EcsSystem<[PathFindingLevelEcsComponent]> => ({
  query: [pathFindingLevelId],
  update: (world, { components: [levels] }) => {
    for (const level of levels) {
      updatePointer(world, renderContext, inputs, level);
    }
  },
});
