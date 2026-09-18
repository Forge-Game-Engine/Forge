import { createComponentId } from '../../../ecs/ecs-component.js';
import { EcsWorld } from '../../../ecs/ecs-world.js';
import type { TerrainMesh } from '../create-terrain-mesh.js';

/**
 * Fields of {@link TerrainMeshEcsComponent} with no sensible default;
 * callers must always provide these.
 */
export interface TerrainMeshRequiredOptions {
  /**
   * The mesh built by `createTerrainMesh` for this entity's terrain. Its
   * vertex data is already baked into world space at build time (see
   * `createTerrainMesh`), so `createTerrainRenderEcsSystem` draws it as-is,
   * without reading this entity's own position/rotation.
   */
  mesh: TerrainMesh;
}

/**
 * Fields of {@link TerrainMeshEcsComponent} with a sensible default; callers
 * may omit these.
 */
export interface TerrainMeshDefaultedOptions {
  /**
   * A bitmask matched against each camera's `cullingMask` (`matchesMask`),
   * the same convention `Renderable.category` uses for sprites, to decide
   * whether a given camera draws this terrain mesh. Defaults to
   * `0xffffffff` (every camera).
   */
  category: number;
}

export interface TerrainMeshEcsComponent
  extends TerrainMeshRequiredOptions, TerrainMeshDefaultedOptions {}

export const terrainMeshId =
  createComponentId<TerrainMeshEcsComponent>('terrainMesh');

const defaultTerrainMeshOptions: TerrainMeshDefaultedOptions = {
  category: 0xffffffff,
};

/**
 * Attaches a {@link TerrainMeshEcsComponent} to `entity`, so
 * `createTerrainRenderEcsSystem` draws its `mesh` every frame. A world can
 * have any number of entities with this component - each terrain mesh is
 * drawn independently, so multiple `TerrainCollider`s can each have their
 * own visualized mesh.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the terrain mesh. `mesh` has no
 * sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addTerrainMeshComponent(
  world: EcsWorld,
  entity: number,
  options: TerrainMeshRequiredOptions & Partial<TerrainMeshEcsComponent>,
): TerrainMeshEcsComponent {
  const component: TerrainMeshEcsComponent = {
    ...defaultTerrainMeshOptions,
    ...options,
  };

  return world.addComponent(entity, terrainMeshId, component);
}
