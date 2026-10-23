import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { markGridFromColliders } from '@forge-game-engine/forge/navigation';
import { tilemapColliderId } from '@forge-game-engine/forge/tilemaps';
import {
  NavigationDemoEcsComponent,
  navigationDemoId,
} from './_navigation.component';

/**
 * Creates the system that bakes the navigation grid from the map's static
 * colliders (the walls layer's and the water's) whenever the walls
 * layer's collider has been rebuilt since the last bake.
 *
 * A bake only blocks cells, so it opens every cell first. The player's
 * body is dynamic, so it never blocks the grid.
 *
 * It bakes with no `agentRadius`. With one, a cell stays walkable only
 * when its whole diamond clears the radius, so every cell beside a wall
 * would be blocked. Without one, every cell a wall, crate or tree base
 * overlaps is blocked, and those bases stay inside their cells. The centre
 * of a diamond beside a blocked one is about 14 units from it, more than
 * the player's foot radius, so feet on the path's cell centres clear them.
 *
 * Register it after `createTilemapColliderEcsSystem`, so a wall clicked
 * this tick is in the collider it bakes.
 * @returns The ECS system.
 */
export const createBakeGridEcsSystem = (): EcsSystem<
  [NavigationDemoEcsComponent]
> => ({
  query: [navigationDemoId],
  update: (world, { components: [navigationStates] }) => {
    for (const navigation of navigationStates) {
      const collider = world.getComponent(navigation.walls, tilemapColliderId);

      if (!collider || collider.bakedVersion === navigation.bakedVersion) {
        continue;
      }

      const { grid } = navigation;

      grid.fillWalkable(grid.cells, true);
      markGridFromColliders(world, grid);
      navigation.bakedVersion = collider.bakedVersion;
    }
  },
});
