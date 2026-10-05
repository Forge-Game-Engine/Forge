import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  CameraEcsComponent,
  cameraId,
  PostProcessEcsComponent,
  postProcessId,
} from '../components/index.js';
import { drawFullscreenQuad } from '../fullscreen-pass.js';
import { PostProcessWriter } from '../post-process-writer.js';
import { RenderContext } from '../render-context.js';
import { RenderTarget } from '../render-target.js';

/**
 * Creates a system that runs custom full-screen shaders over cameras'
 * images: for each camera with both a `renderTarget` and a
 * `PostProcessEcsComponent`, draws every one of its `materials` in order,
 * each sampling the previous pass's output through its `u_texture`
 * uniform, and leaves the result in the camera's `renderTarget`. Cameras
 * without a `renderTarget` are left untouched. When cameras share a render
 * target, only the first one's passes run over it.
 *
 * Every pass runs where this system is registered: after the render system
 * (and after the built-in effects, e.g. tone mapping, whose output the
 * passes should see) and before the present system.
 * @param renderContext - The rendering context.
 * @returns The post-processing ECS system.
 */
export const createPostProcessEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraEcsComponent, PostProcessEcsComponent]> => {
  const writer = new PostProcessWriter(renderContext);
  const processedTargetsThisFrame = new Set<RenderTarget>();

  return {
    query: [cameraId, postProcessId],
    update: (_world, { components: [cameras, postProcesses] }) => {
      processedTargetsThisFrame.clear();

      for (let i = 0; i < cameras.length; i++) {
        const { renderTarget } = cameras[i];
        const { materials } = postProcesses[i];

        if (!renderTarget || processedTargetsThisFrame.has(renderTarget)) {
          continue;
        }

        processedTargetsThisFrame.add(renderTarget);

        writer.write(renderTarget, materials.length, (source, passIndex) => {
          const material = materials[passIndex];

          material.setUniform('u_texture', source);
          drawFullscreenQuad(renderContext, material);
        });
      }
    },
    cleanup: () => {
      writer.dispose();
    },
  };
};
