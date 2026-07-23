import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
} from '@forge-game-engine/forge/common';
import {
  CameraEcsComponent,
  cameraId,
  createProjectionMatrix,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import type { TerrainMesh } from './_create-terrain';

/**
 * Creates an ECS system that draws `terrainMesh` directly - a single,
 * non-instanced `gl.drawArrays` call against its own geometry and material
 * - rather than going through the sprite pipeline `createRenderEcsSystem`
 * batches (which only knows how to draw quads). Register it *before*
 * `createRenderEcsSystem`, with `renderContext.clearStrategy` set to
 * `CLEAR_STRATEGY.none` (see `_create-game.ts`), so this system's own clear
 * is the only one each frame - `createRenderEcsSystem`'s would otherwise
 * wipe the terrain right before drawing the sprites on top of it.
 *
 * Assumes a single camera rendering straight to the canvas, which is all
 * this demo needs; a multi-camera setup would need to track which
 * destinations have already been cleared this frame, the way
 * `createRenderEcsSystem` does internally.
 * @param renderContext - The render context to draw into.
 * @param terrainMesh - The terrain mesh built by `createTerrain`.
 */
export const createTerrainRenderEcsSystem = (
  renderContext: RenderContext,
  terrainMesh: TerrainMesh,
): EcsSystem<[CameraEcsComponent, PositionEcsComponent]> => ({
  query: [cameraId, positionId],
  run: (result) => {
    const [cameraComponent, positionComponent] = result.components;
    const { gl } = renderContext;
    const { geometry, material, vertexCount } = terrainMesh;

    renderContext.bindRenderTarget(cameraComponent.renderTarget ?? null);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const projectionMatrix = createProjectionMatrix(
      renderContext.width,
      renderContext.height,
      positionComponent.world,
      cameraComponent.zoom,
    );

    material.setUniform('u_projection', projectionMatrix);
    material.bind(gl);
    geometry.bind(gl, material.program);

    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  },
});
