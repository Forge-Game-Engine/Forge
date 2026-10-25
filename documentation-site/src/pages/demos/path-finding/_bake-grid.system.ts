import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { markGridFromColliders } from '@forge-game-engine/forge/navigation';
import {
  PathFindingLevelEcsComponent,
  pathFindingLevelId,
} from './_level.component';

/**
 * Creates the system that bakes the navigation grid from the level's walls
 * whenever a wall has moved since the last bake, and on the first frame.
 *
 * `markGridFromColliders` only ever blocks cells, so the bake opens every
 * cell first. It bakes every static collider: the walls have no rigid body,
 * so they're baked, and the units' bodies are dynamic, so they never block
 * a cell. The unit radius is the agent radius, so every cell within a
 * unit's radius of a wall is blocked too, and a unit walking a path through
 * the walkable cells never scrapes a wall.
 *
 * Baking raises the grid's `version`, so every navigation agent plans its
 * path again in the next physics step.
 *
 * Register it in the default group, after the frame's transform system,
 * which places the walls where it reads them. The navigation agent system
 * runs in the fixed-update group, so it plans on the new grid from the next
 * step.
 * @returns The ECS system.
 */
export const createBakeGridEcsSystem = (): EcsSystem<
  [PathFindingLevelEcsComponent]
> => ({
  query: [pathFindingLevelId],
  update: (world, { components: [levels] }) => {
    for (const level of levels) {
      if (level.wallsVersion === level.bakedVersion) {
        continue;
      }

      const { grid } = level;

      grid.fillWalkable(grid.cells, true);
      markGridFromColliders(world, grid, { agentRadius: level.unitRadius });
      level.bakedVersion = level.wallsVersion;
    }
  },
});
