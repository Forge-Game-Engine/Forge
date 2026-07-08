import { EcsSystem } from '../../ecs/ecs-system.js';
import { CameraEcsComponent, cameraId } from '../components/index.js';
import { createFullscreenQuadGeometry } from '../geometry/index.js';
import { Material } from '../materials/index.js';
import { RenderContext } from '../render-context.js';

/**
 * Creates a system that presents each camera's off-screen render target
 * onto the canvas, by drawing the target's color texture with a
 * full-screen quad. Cameras without a `renderTarget` are left untouched,
 * since they already render directly onto the canvas.
 * @param renderContext The rendering context
 * @returns The present ECS system
 */
export const createPresentEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraEcsComponent], void, void> => {
  const { gl, shaderCache } = renderContext;

  const material = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('passthrough.frag'),
    gl,
  );

  const geometry = createFullscreenQuadGeometry(gl);

  return {
    query: [cameraId],
    run: (result) => {
      const [camera] = result.components;

      if (!camera.renderTarget) {
        return;
      }

      material.setUniform('u_texture', camera.renderTarget.colorTexture);

      renderContext.bindRenderTarget(null);
      renderContext.clear();

      material.bind(gl);
      geometry.bind(gl, material.program);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
  };
};
