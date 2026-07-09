import { EcsSystem } from '../../ecs/ecs-system.js';
import { CameraEcsComponent, cameraId } from '../components/index.js';
import {
  beginFullscreenReplacePass,
  drawFullscreenQuad,
} from '../fullscreen-pass.js';
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
 * layers don't erase earlier ones.
 *
 * `run` only gathers each camera's `renderTarget` and `layer`; `afterRun`
 * dedupes and sorts them once every camera has run, then does the actual
 * presenting, since the draw order depends on every camera's `layer` and
 * can only be resolved once the whole tick's cameras are known.
 * @param renderContext The rendering context
 * @returns The present ECS system
 */
export const createPresentEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraEcsComponent], null, PresentCommand | null> => {
  const { gl, shaderCache, programCache, materialCache } = renderContext;

  const material = materialCache.getMaterial(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('passthrough.frag'),
    gl,
    programCache,
  );

  return {
    query: [cameraId],
    run: (result) => {
      const [camera] = result.components;
      const { renderTarget, layer } = camera;

      if (!renderTarget) {
        return null;
      }

      return { layer, renderTarget };
    },
    afterRun: (results) => {
      const targetsSeen = new Set<RenderTarget>();
      const presentCommands: PresentCommand[] = [];

      for (const command of results) {
        if (!command || targetsSeen.has(command.renderTarget)) {
          continue;
        }

        targetsSeen.add(command.renderTarget);
        presentCommands.push(command);
      }

      presentCommands.sort((a, b) => a.layer - b.layer);

      presentCommands.forEach(({ renderTarget }, index) => {
        material.setUniform('u_texture', renderTarget.colorTexture);

        if (index === 0) {
          beginFullscreenReplacePass(renderContext, null);
        } else {
          // A later layer (for example a sharp foreground on top of a
          // blurred background): don't clear what earlier layers already
          // drew, and blend so this layer's transparent pixels let them
          // show through instead of overwriting them with the clear color.
          renderContext.bindRenderTarget(null);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }

        drawFullscreenQuad(renderContext, material);
      });
    },
  };
};
