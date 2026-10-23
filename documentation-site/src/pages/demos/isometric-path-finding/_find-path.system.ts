import { positionId } from '@forge-game-engine/forge/common';
import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { findGridPath } from '@forge-game-engine/forge/navigation';
import { visibilityId } from '@forge-game-engine/forge/rendering';
import { CellCursorEcsComponent, cellCursorId } from './_cell-cursor.component';
import {
  NavigationDemoEcsComponent,
  navigationDemoId,
} from './_navigation.component';

/**
 * Puts one marker on each point of the path and hides the rest. Markers
 * are root entities, so their local position is in world space.
 */
const placeMarkers = (
  world: EcsWorld,
  markers: readonly number[],
  points: readonly Vector2[],
): void => {
  for (let i = 0; i < markers.length; i++) {
    const position = world.getComponent(markers[i], positionId);
    const visibility = world.getComponent(markers[i], visibilityId);

    if (!position || !visibility) {
      continue;
    }

    visibility.visible = i < points.length;

    if (i < points.length) {
      position.local.x = points[i].x;
      position.local.y = points[i].y;
    }
  }
};

const updatePath = (
  world: EcsWorld,
  navigation: NavigationDemoEcsComponent,
  cursor: CellCursorEcsComponent,
): void => {
  const { grid, agent, markers } = navigation;
  const goal = cursor.hoveredCell;
  const agentPosition = world.getComponent(agent, positionId);

  // The cursor only picks the grid's cells, so a hovered cell is in it.
  if (!agentPosition || goal === null) {
    placeMarkers(world, markers, []);

    return;
  }

  // A start or goal in a blocked cell moves to the nearest walkable cell,
  // so the path starts even when the player's feet are near a wall. A
  // walled-off goal gives the path to the cell nearest it.
  const { points } = findGridPath(
    grid,
    agentPosition.world,
    grid.cellToWorld(goal.column, goal.row),
  );

  placeMarkers(world, markers, points);
};

/**
 * Creates the system that finds the path from the agent to the cell under
 * the mouse each frame, and draws it with one marker on each cell centre.
 *
 * It reads the cursor's cell and the baked grid, so register it after
 * the cell cursor and bake systems, and before `createTransformEcsSystem`,
 * so the markers are drawn where they're moved on the same frame.
 * @returns The ECS system.
 */
export const createFindPathEcsSystem = (): EcsSystem<
  [NavigationDemoEcsComponent, CellCursorEcsComponent]
> => ({
  query: [navigationDemoId, cellCursorId],
  update: (world, { components: [navigationStates, cursors] }) => {
    for (let i = 0; i < navigationStates.length; i++) {
      updatePath(world, navigationStates[i], cursors[i]);
    }
  },
});
