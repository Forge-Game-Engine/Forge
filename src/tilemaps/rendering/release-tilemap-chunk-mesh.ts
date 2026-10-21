// Releasing one mesh of a tilemap layer. Not exported from the package.

import type { EcsWorld } from '../../ecs/ecs-world.js';
import type {
  TilemapChunkMesh,
  TilemapYSortMesh,
} from '../components/tilemap-render-state-component.js';

/**
 * Removes a chunk mesh's entity, if it's still alive, and disposes its
 * geometry.
 * @param world - The world the mesh's entity belongs to.
 * @param mesh - The mesh.
 */
export function releaseTilemapChunkMesh(
  world: EcsWorld,
  mesh: TilemapChunkMesh,
): void {
  // When the layer entity itself is removed, the world removes its
  // children first, so the mesh entity is already gone.
  if (world.isAlive(mesh.entity)) {
    world.removeEntity(mesh.entity);
  }

  mesh.geometry.dispose();
}

/**
 * Removes every row entity of a y-sort mesh that's still alive, then
 * disposes the geometry they share, once.
 * @param world - The world the rows' entities belong to.
 * @param mesh - The mesh.
 */
export function releaseTilemapYSortMesh(
  world: EcsWorld,
  mesh: TilemapYSortMesh,
): void {
  for (const { entity } of mesh.rows) {
    if (world.isAlive(entity)) {
      world.removeEntity(entity);
    }
  }

  mesh.geometry.dispose();
}
