import { EcsSystem } from '../../ecs/index.js';
import { PositionEcsComponent, positionId } from '../../common/index.js';
import { matchesMask } from '../../utilities/matches-mask.js';
import { CameraEcsComponent, cameraId } from '../components/index.js';
import { CLEAR_STRATEGY } from '../enums/index.js';
import { RenderContext } from '../render-context.js';
import { RenderTarget } from '../render-target.js';
import { createProjectionMatrix } from '../shaders/index.js';
import { calculatePixelsPerUnit } from '../utilities/calculate-pixels-per-unit.js';
import { TerrainMeshEcsComponent, terrainMeshId } from './components/index.js';

function drawTerrainMeshesForCamera(
  renderContext: RenderContext,
  terrainMeshComponents: readonly TerrainMeshEcsComponent[],
  cameraComponent: CameraEcsComponent,
  cameraPositionComponent: PositionEcsComponent,
  clearedDestinationsThisUpdate: Set<RenderTarget | null>,
): void {
  const { gl } = renderContext;
  const target = cameraComponent.renderTarget ?? null;

  renderContext.bindRenderTarget(target);

  if (!clearedDestinationsThisUpdate.has(target)) {
    const { clearColor } = cameraComponent;

    gl.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a);
    gl.clear(gl.COLOR_BUFFER_BIT);
    clearedDestinationsThisUpdate.add(target);
  }

  const pixelsPerUnit = calculatePixelsPerUnit(
    renderContext.height,
    cameraComponent.verticalWorldUnits,
  );

  const projectionMatrix = createProjectionMatrix(
    renderContext.width,
    renderContext.height,
    cameraPositionComponent.world,
    cameraComponent.zoom,
    pixelsPerUnit,
  );

  for (const terrainMeshComponent of terrainMeshComponents) {
    if (
      !matchesMask(terrainMeshComponent.category, cameraComponent.cullingMask)
    ) {
      continue;
    }

    const { geometry, material, vertexCount } = terrainMeshComponent.mesh;

    material.setUniform('u_projection', projectionMatrix);
    material.bind(gl);
    geometry.bind(gl, material.program);

    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  }
}

/**
 * Creates an ECS system that draws every entity with a
 * `TerrainMeshEcsComponent` (see `addTerrainMeshComponent`) - one
 * non-instanced `gl.drawArrays` call per mesh, against its own geometry and
 * material - rather than going through the sprite pipeline
 * `createRenderEcsSystem` batches (which only knows how to draw quads).
 * Register it *before* `createRenderEcsSystem` so terrain draws underneath
 * sprites.
 *
 * A world can have any number of terrain mesh entities; each is matched
 * against every camera's `cullingMask` (via `TerrainMeshEcsComponent.category`,
 * the same convention `Renderable.category` uses for sprites) exactly like
 * a normal renderable, so different cameras can show different terrain
 * meshes.
 *
 * This system owns clearing each camera's destination for the frame:
 * whenever there's at least one terrain mesh to draw, it sets
 * `renderContext.clearStrategy` to `CLEAR_STRATEGY.none` so
 * `createRenderEcsSystem`'s own clear (which would otherwise wipe the
 * terrain right before drawing sprites on top of it) becomes a no-op, and
 * clears each camera's destination itself instead - callers never need to
 * touch `clearStrategy` themselves. `clearStrategy` is left untouched while
 * no terrain mesh entities exist yet (e.g. before an async-loaded terrain
 * mesh has resolved), so the sprite pipeline keeps clearing normally until
 * there's terrain to draw.
 * @param renderContext - The render context to draw into.
 */
export const createTerrainRenderEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraEcsComponent, PositionEcsComponent]> => ({
  query: [cameraId, positionId],
  update: (world, { components: [cameraComponents, positionComponents] }) => {
    const {
      components: [terrainMeshComponents],
    } = world.query<[TerrainMeshEcsComponent]>([terrainMeshId]);

    if (terrainMeshComponents.length === 0) {
      return;
    }

    renderContext.clearStrategy = CLEAR_STRATEGY.none;

    const clearedDestinationsThisUpdate = new Set<RenderTarget | null>();

    for (let i = 0; i < cameraComponents.length; i++) {
      drawTerrainMeshesForCamera(
        renderContext,
        terrainMeshComponents,
        cameraComponents[i],
        positionComponents[i],
        clearedDestinationsThisUpdate,
      );
    }
  },
});
