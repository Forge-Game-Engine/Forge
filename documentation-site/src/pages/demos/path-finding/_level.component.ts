import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { NavigationGrid } from '@forge-game-engine/forge/navigation';
import { Aabb } from '@forge-game-engine/forge/physics';

/**
 * The level the units walk: its navigation grid, the units, the camera the
 * mouse is read through, the wall being dragged, and the versions that
 * decide when the grid is baked again.
 */
export interface PathFindingLevelEcsComponent {
  /** The grid the units' paths are planned over. */
  grid: NavigationGrid;

  /** The camera the mouse is converted to a world position through. */
  camera: number;

  /** The units, each with a navigation agent and a rigid body. */
  units: number[];

  /**
   * The radius of a unit's collider. The grid is baked with it as the
   * agent radius, so a unit following a path stays clear of the walls.
   */
  unitRadius: number;

  /**
   * The area walls can be dragged in: inside the level's border, in world
   * units.
   */
  bounds: Aabb;

  /**
   * Raised by the pointer system each time it moves a wall. Starts one
   * ahead of `bakedVersion`, so the grid is baked on the first tick.
   */
  wallsVersion: number;

  /** The `wallsVersion` the grid was last baked at. */
  bakedVersion: number;

  /** The wall being dragged, or `null`. */
  draggedWall: number | null;

  /** The dragged wall's position minus the mouse's, when the drag began. */
  grabOffset: Vector2;
}

export const pathFindingLevelId =
  createComponentId<PathFindingLevelEcsComponent>('path-finding-level');

/**
 * Attaches a {@link PathFindingLevelEcsComponent} to `entity`.
 * @param world - The world the entity belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - The grid, camera, units, unit radius and drag bounds.
 * @returns The attached component.
 */
export function addPathFindingLevelComponent(
  world: EcsWorld,
  entity: number,
  options: Pick<
    PathFindingLevelEcsComponent,
    'grid' | 'camera' | 'units' | 'unitRadius' | 'bounds'
  >,
): PathFindingLevelEcsComponent {
  return world.addComponent(entity, pathFindingLevelId, {
    ...options,
    wallsVersion: 0,
    bakedVersion: -1,
    draggedWall: null,
    grabOffset: { x: 0, y: 0 },
  });
}
