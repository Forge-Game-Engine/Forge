import { EcsSystem } from '../../ecs/index.js';
import { PositionEcsComponent, positionId } from '../../common/index.js';
import { CameraEcsComponent, cameraId } from '../components/index.js';
import { RenderContext } from '../render-context.js';
import { createProjectionMatrix } from '../shaders/index.js';
import { calculatePixelsPerUnit } from '../utilities/calculate-pixels-per-unit.js';
import type { TerrainMesh } from './create-terrain-mesh.js';

/**
 * Creates an ECS system that draws `terrainMesh` directly - a single,
 * non-instanced `gl.drawArrays` call against its own geometry and material
 * - rather than going through the sprite pipeline `createRenderEcsSystem`
 * batches (which only knows how to draw quads). Register it *before*
 * `createRenderEcsSystem`, with `renderContext.clearStrategy` set to
 * `CLEAR_STRATEGY.none`, so this system's own clear is the only one each
 * frame - `createRenderEcsSystem`'s would otherwise wipe the terrain right
 * before drawing sprites on top of it.
 *
 * Assumes a single camera rendering straight to the canvas; a multi-camera
 * setup would need to track which destinations have already been cleared
 * this frame, the way `createRenderEcsSystem` does internally.
 * @param renderContext - The render context to draw into.
 * @param terrainMesh - The terrain mesh built by `createTerrainMesh`.
 */
export const createTerrainRenderEcsSystem = (
  renderContext: RenderContext,
  terrainMesh: TerrainMesh,
): EcsSystem<[CameraEcsComponent, PositionEcsComponent]> => ({
  query: [cameraId, positionId],
  update: (_world, { components: [cameraComponents, positionComponents] }) => {
    const { gl } = renderContext;
    const { geometry, material, vertexCount } = terrainMesh;

    for (let i = 0; i < cameraComponents.length; i++) {
      const cameraComponent = cameraComponents[i];
      const positionComponent = positionComponents[i];

      renderContext.bindRenderTarget(cameraComponent.renderTarget ?? null);

      const { clearColor } = cameraComponent;

      gl.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const pixelsPerUnit = calculatePixelsPerUnit(
        renderContext.height,
        cameraComponent.verticalWorldUnits,
      );

      const projectionMatrix = createProjectionMatrix(
        renderContext.width,
        renderContext.height,
        positionComponent.world,
        cameraComponent.zoom,
        pixelsPerUnit,
      );

      material.setUniform('u_projection', projectionMatrix);
      material.bind(gl);
      geometry.bind(gl, material.program);

      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    }
  },
});
