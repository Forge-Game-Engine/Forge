import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { visibilityId } from '@forge-game-engine/forge/rendering';
import {
  PathFindingLevelEcsComponent,
  pathFindingLevelId,
} from './_level.component';
import {
  PathFindingViewEcsComponent,
  pathFindingViewId,
} from './_path-finding-view.component';

/**
 * Creates the system that shows a translucent square over every blocked
 * cell of the grid while the panel's "Blocked cells" toggle is on. It only
 * touches the squares when the grid's `version` or the toggle has changed
 * since it last drew them.
 * @returns The ECS system.
 */
export const createGridOverlayEcsSystem = (): EcsSystem<
  [PathFindingLevelEcsComponent, PathFindingViewEcsComponent]
> => ({
  query: [pathFindingLevelId, pathFindingViewId],
  update: (world, { components: [levels, views] }) => {
    for (let i = 0; i < levels.length; i++) {
      const { grid } = levels[i];
      const view = views[i];

      if (
        grid.version === view.drawnGridVersion &&
        view.showBlockedCells === view.drawnShowBlockedCells
      ) {
        continue;
      }

      for (const [node, overlay] of view.cellOverlays.entries()) {
        const visibility = world.getComponent(overlay, visibilityId);

        if (!visibility) {
          continue;
        }

        const { column, row } = grid.nodeToCell(node);

        visibility.visible =
          view.showBlockedCells && !grid.isWalkable(column, row);
      }

      view.drawnGridVersion = grid.version;
      view.drawnShowBlockedCells = view.showBlockedCells;
    }
  },
});
