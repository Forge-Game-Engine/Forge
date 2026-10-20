// Releasing one chunk mesh of a tilemap layer. Not exported from the
// package.

import type { EcsWorld } from '../../ecs/ecs-world.js';
import type { TilemapChunkMesh } from '../components/tilemap-render-state-component.js';

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
