import { EcsSystem } from '../../ecs/ecs-system.js';
import { CameraEcsComponent, cameraId } from '../components/index.js';
import { createFullscreenQuadGeometry } from '../geometry/index.js';
import { Material } from '../materials/index.js';
import { RenderContext } from '../render-context.js';
import { RenderTarget } from '../render-target.js';

/**
 * Creates a system that presents each distinct off-screen render target in
 * use by a camera onto the canvas, by drawing the target's color texture
 * with a full-screen quad. Cameras without a `renderTarget` are left
 * untouched, since they already render directly onto the canvas. Cameras
 * that share the same `renderTarget` (for example a background and
 * foreground camera composited into one scene) only present it once per
 * frame.
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
  const presentedTargetsThisFrame = new Set<RenderTarget>();

  return {
    query: [cameraId],
    beforeQuery: () => {
      presentedTargetsThisFrame.clear();
    },
    run: (result) => {
      const [camera] = result.components;
      const { renderTarget } = camera;

      if (!renderTarget || presentedTargetsThisFrame.has(renderTarget)) {
        return;
      }

      presentedTargetsThisFrame.add(renderTarget);

      material.setUniform('u_texture', renderTarget.colorTexture);

      renderContext.bindRenderTarget(null);
      renderContext.clear();

      // A full-screen present replaces every canvas pixel, so it must not
      // blend with whatever was drawn before. Blending is left enabled as
      // global GL state by the render system's sprite drawing; blending a
      // partially-transparent source onto the just-cleared, transparent
      // canvas would darken/fade it instead of showing it as-is.
      gl.disable(gl.BLEND);

      material.bind(gl);
      geometry.bind(gl, material.program);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
  };
};
