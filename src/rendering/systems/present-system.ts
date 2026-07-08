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
 *
 * Multiple *different* render targets presented in the same frame (for
 * example a blurred background target and a separate, sharp foreground
 * target) are layered onto the canvas in camera order: the first present
 * this frame clears the canvas and replaces it outright, and every
 * subsequent present alpha-blends on top instead, so later layers don't
 * erase earlier ones.
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
  let hasPresentedToCanvasThisFrame = false;

  return {
    query: [cameraId],
    beforeQuery: () => {
      presentedTargetsThisFrame.clear();
      hasPresentedToCanvasThisFrame = false;
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

      if (hasPresentedToCanvasThisFrame) {
        // A later layer (for example a sharp foreground on top of a
        // blurred background): don't clear what earlier layers already
        // drew, and blend so this layer's transparent pixels let them
        // show through instead of overwriting them with the clear color.
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      } else {
        renderContext.clear();

        // The first layer replaces every canvas pixel, so it must not
        // blend with whatever was drawn before. Blending is left enabled
        // as global GL state by the render system's sprite drawing;
        // blending a partially-transparent source onto the just-cleared,
        // transparent canvas would darken/fade it instead of showing it
        // as-is.
        gl.disable(gl.BLEND);
        hasPresentedToCanvasThisFrame = true;
      }

      material.bind(gl);
      geometry.bind(gl, material.program);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
  };
};
