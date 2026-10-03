import { EcsSystem } from '../../ecs/ecs-system.js';
import { CameraEcsComponent, cameraId } from '../components/index.js';
import {
  beginFullscreenReplacePass,
  drawFullscreenQuad,
} from '../fullscreen-pass.js';
import { Material } from '../index.js';
import { RenderContext } from '../render-context.js';
import { RenderTarget } from '../render-target.js';

interface PresentCommand {
  layer: number;
  renderTarget: RenderTarget;
}

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
 * target) are layered onto the canvas in ascending `CameraEcsComponent.layer`
 * order: the lowest layer clears the canvas and replaces it outright, and
 * every subsequent (higher) layer alpha-blends on top instead, so later
 * layers don't erase earlier ones. If any camera renders straight to the
 * canvas, the canvas already holds this frame's output from that camera, so
 * every layer (the lowest included) alpha-blends on top of it instead of
 * replacing it: canvas cameras always end up beneath every presented render
 * target, regardless of `layer`.
 *
 * Render targets hold premultiplied-alpha color (see
 * `createRenderEcsSystem`), so layers are blended with
 * `blendFunc(ONE, ONE_MINUS_SRC_ALPHA)`: a translucent pixel in a target
 * reaches the canvas at exactly the opacity it was drawn with.
 *
 * `update` first gathers each camera's `renderTarget` and `layer`, then
 * dedupes and sorts them, then does the actual presenting, since the draw
 * order depends on every camera's `layer` and can only be resolved once the
 * whole tick's cameras are known.
 * @param renderContext The rendering context
 * @returns The present ECS system
 */
export const createPresentEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraEcsComponent]> => {
  const { gl, shaderCache } = renderContext;

  const material = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('passthrough.frag'),
    gl,
  );

  return {
    query: [cameraId],
    update: (_world, { components: [cameras] }) => {
      const targetsSeen = new Set<RenderTarget>();
      const presentCommands: PresentCommand[] = [];
      let isCanvasAlreadyDrawn = false;

      for (const camera of cameras) {
        const { renderTarget, layer } = camera;

        if (!renderTarget) {
          isCanvasAlreadyDrawn = true;

          continue;
        }

        if (targetsSeen.has(renderTarget)) {
          continue;
        }

        targetsSeen.add(renderTarget);
        presentCommands.push({ layer, renderTarget });
      }

      presentCommands.sort((a, b) => a.layer - b.layer);

      presentCommands.forEach(({ renderTarget }, index) => {
        material.setUniform('u_texture', renderTarget.colorTexture);

        if (index === 0 && !isCanvasAlreadyDrawn) {
          beginFullscreenReplacePass(renderContext, null);
        } else {
          // Either a later layer (for example a sharp foreground on top of
          // a blurred background), or any layer once a camera without a
          // render target has already cleared and drawn onto the canvas
          // this frame (for example a UI canvas over a world camera that
          // renders straight to the screen). Either way, don't clear what's
          // already there, and blend so this layer's transparent pixels let
          // it show through. The target's color is already premultiplied,
          // so its source factor is `ONE`, not `SRC_ALPHA`, which would
          // multiply its alpha in a second time.
          renderContext.bindRenderTarget(null);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        }

        drawFullscreenQuad(renderContext, material);
      });

      // Blending is global GL state: leave it off, as the render system
      // does, so a pass that draws before the next frame's sprites (for
      // example `createTerrainRenderEcsSystem`) never inherits this pass's
      // premultiplied blend function.
      gl.disable(gl.BLEND);
    },
  };
};
