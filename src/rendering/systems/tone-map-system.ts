import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  CameraEcsComponent,
  cameraId,
  ToneMappingEcsComponent,
  toneMappingId,
} from '../components/index.js';
import { TONE_MAPPING_OPERATOR } from '../enums/index.js';
import { drawFullscreenQuad } from '../fullscreen-pass.js';
import { Material } from '../materials/index.js';
import { PostProcessWriter } from '../post-process-writer.js';
import { RenderContext } from '../render-context.js';
import { RenderTarget } from '../render-target.js';

/**
 * Creates a tone mapping post-processing system: compresses a camera's HDR
 * render target back into displayable `[0, 1]` range.
 *
 * For each camera with both a `renderTarget` and a
 * `ToneMappingEcsComponent`, applies the configured exposure and operator
 * (see `TONE_MAPPING_OPERATOR`) and writes the result back into that same
 * `renderTarget`. Cameras without a `renderTarget`, or without a
 * `ToneMappingEcsComponent` (attach one with `addToneMappingComponent`), are left
 * untouched.
 *
 * Must be registered after any HDR-producing passes (render, bloom, blur)
 * and before the present system, since anything left un-tone-mapped is
 * presented as-is and hard-clips at `[0, 1]` instead of rolling off
 * smoothly.
 * @param renderContext The rendering context
 * @returns The tone mapping ECS system
 */
export const createToneMapEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraEcsComponent, ToneMappingEcsComponent]> => {
  const { gl, shaderCache } = renderContext;

  const toneMapMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('tone-mapping.frag'),
    gl,
  );
  const writer = new PostProcessWriter(renderContext);
  const processedTargetsThisFrame = new Set<RenderTarget>();

  return {
    query: [cameraId, toneMappingId],
    update: (_world, { components: [cameras, toneMappings] }) => {
      processedTargetsThisFrame.clear();

      for (let i = 0; i < cameras.length; i++) {
        const camera = cameras[i];
        const toneMapping = toneMappings[i];
        const { renderTarget } = camera;

        if (!renderTarget || processedTargetsThisFrame.has(renderTarget)) {
          continue;
        }

        processedTargetsThisFrame.add(renderTarget);

        writer.write(renderTarget, 1, (source) => {
          toneMapMaterial.setUniform('u_texture', source);
          toneMapMaterial.setUniform('u_exposure', toneMapping.exposure);
          toneMapMaterial.setUniform(
            'u_useAces',
            toneMapping.operator === TONE_MAPPING_OPERATOR.aces,
          );

          drawFullscreenQuad(renderContext, toneMapMaterial);
        });
      }
    },
    cleanup: () => {
      writer.dispose();
    },
  };
};
