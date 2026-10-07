import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  CameraEcsComponent,
  cameraId,
  ToneMappingEcsComponent,
  toneMappingId,
} from '../components/index.js';
import { TONE_MAPPING_OPERATOR } from '../enums/index.js';
import {
  beginPostProcessPass,
  drawFullscreenQuad,
} from '../fullscreen-pass.js';
import { Material } from '../materials/index.js';
import { RenderContext } from '../render-context.js';
import { RenderTarget } from '../render-target.js';

/**
 * Creates a tone mapping post-processing system: compresses a camera's HDR
 * render target back into displayable `[0, 1]` range.
 *
 * For each camera with both a `renderTarget` and a
 * `ToneMappingEcsComponent`, applies the configured exposure and operator
 * (see `TONE_MAPPING_OPERATOR`) in one post-processing pass over that
 * `renderTarget` (see `beginPostProcessPass`). Cameras without a `renderTarget`, or without a
 * `ToneMappingEcsComponent` (attach one with `addToneMappingComponent`), are left
 * untouched.
 *
 * Must be registered after any HDR-producing passes (render, bloom, blur)
 * and before the present system, since anything left un-tone-mapped is
 * presented as-is and hard-clips at `[0, 1]` instead of rolling off
 * smoothly.
 *
 * Costs one full-screen draw per tone-mapped render target a frame. The
 * first time a render target is tone-mapped, it allocates its second color
 * buffer, at its own format and size.
 * @param renderContext The rendering context
 * @returns The tone mapping ECS system
 */
export const createToneMapEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraEcsComponent, ToneMappingEcsComponent]> => {
  const { shaderCache } = renderContext;

  const toneMapMaterial = new Material(
    renderContext,
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('tone-mapping.frag'),
  );

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

        const source = beginPostProcessPass(renderContext, renderTarget);

        toneMapMaterial.setUniform('u_texture', source);
        toneMapMaterial.setUniform('u_exposure', toneMapping.exposure);
        toneMapMaterial.setUniform(
          'u_useAces',
          toneMapping.operator === TONE_MAPPING_OPERATOR.aces,
        );

        drawFullscreenQuad(renderContext, toneMapMaterial);
      }
    },
  };
};
