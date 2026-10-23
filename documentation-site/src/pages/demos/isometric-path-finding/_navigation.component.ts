import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { NavigationGrid } from '@forge-game-engine/forge/navigation';

/**
 * A navigation grid over the map, the colliders it's baked from, and the
 * markers that draw the path from an agent to the cell cursor's cell.
 */
export interface NavigationDemoEcsComponent {
  /** The grid, with the same layout and cells as the map's layers. */
  grid: NavigationGrid;

  /** The walls layer entity, whose collider the grid is baked from. */
  walls: number;

  /**
   * The walls layer `version` its collider was built from when the grid
   * was last baked, or `null` before the first bake.
   */
  bakedVersion: number | null;

  /** The entity the path starts from. */
  agent: number;

  /** One marker entity per cell, so a path never needs more. */
  markers: number[];
}

export const navigationDemoId =
  createComponentId<NavigationDemoEcsComponent>('navigation-demo');

/**
 * Adds the demo's navigation state to an entity, not baked yet.
 * @param world - The world the entity belongs to.
 * @param entity - The entity to add it to.
 * @param navigation - The grid, the walls layer, the agent and the path
 * markers.
 * @returns The added component.
 */
export function addNavigationDemoComponent(
  world: EcsWorld,
  entity: number,
  navigation: Omit<NavigationDemoEcsComponent, 'bakedVersion'>,
): NavigationDemoEcsComponent {
  return world.addComponent(entity, navigationDemoId, {
    ...navigation,
    bakedVersion: null,
  });
}
