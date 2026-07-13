import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  CameraEcsComponent,
  cameraId,
  ToneMappingEcsComponent,
  toneMappingId,
} from '../components/index.js';
import { TONE_MAPPING_OPERATOR } from '../enums/index.js';
import {
  beginFullscreenReplacePass,
  drawFullscreenQuad,
} from '../fullscreen-pass.js';
import { Material } from '../materials/index.js';
import { RenderContext } from '../render-context.js';
import { createRenderTarget, RenderTarget } from '../render-target.js';

/**
 * Creates a tone mapping post-processing system: compresses a camera's HDR
 * render target back into displayable `[0, 1]` range.
 *
 * For each camera with both a `renderTarget` and a
 * `ToneMappingEcsComponent`, applies the configured exposure and operator
 * (see `TONE_MAPPING_OPERATOR`) and writes the result back into that same
 * `renderTarget`. Cameras without a `renderTarget`, or without a
 * `ToneMappingEcsComponent` (attach one with `addToneMapping`), are left
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
): EcsSystem<[CameraEcsComponent, ToneMappingEcsComponent], void, void> => {
  const { gl, shaderCache } = renderContext;

  const toneMapMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('tone-mapping.frag'),
    gl,
  );
  const copyMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('passthrough.frag'),
    gl,
  );

  // Scratch GPU resource, one entry per distinct `renderTarget` in use by a
  // tone-mapped camera, recreated on resize. A full-screen pass can't read
  // and write the same texture in one draw, so the tone-mapped result is
  // written here first, then copied back into `renderTarget` (the same
  // technique `createBloomEcsSystem` uses for its composite pass). Owned by
  // this system (not module-level state) and disposed via `cleanupEntities`
  // when the world stops.
  const scratchTargetByTarget = new WeakMap<RenderTarget, RenderTarget>();

  const getScratchTarget = (target: RenderTarget): RenderTarget => {
    const existing = scratchTargetByTarget.get(target);
    const isStale =
      existing !== undefined &&
      (existing.width !== target.width || existing.height !== target.height);

    if (existing && !isStale) {
      return existing;
    }

    if (existing) {
      existing.dispose(gl);
    }

    const scratchTarget = createRenderTarget(
      gl,
      target.width,
      target.height,
      target.format,
    );

    scratchTargetByTarget.set(target, scratchTarget);

    return scratchTarget;
  };

  const copyTexture = (
    sourceTexture: WebGLTexture,
    destination: RenderTarget,
  ): void => {
    beginFullscreenReplacePass(renderContext, destination);

    copyMaterial.setUniform('u_texture', sourceTexture);

    drawFullscreenQuad(renderContext, copyMaterial);
  };

  const processedTargetsThisFrame = new Set<RenderTarget>();

  return {
    query: [cameraId, toneMappingId],
    beforeQuery: () => {
      processedTargetsThisFrame.clear();
    },
    run: (result) => {
      const [camera, toneMapping] = result.components;
      const { renderTarget } = camera;

      if (!renderTarget || processedTargetsThisFrame.has(renderTarget)) {
        return;
      }

      processedTargetsThisFrame.add(renderTarget);

      const scratchTarget = getScratchTarget(renderTarget);

      beginFullscreenReplacePass(renderContext, scratchTarget);

      toneMapMaterial.setUniform('u_texture', renderTarget.colorTexture);
      toneMapMaterial.setUniform('u_exposure', toneMapping.exposure);
      toneMapMaterial.setUniform(
        'u_useAces',
        toneMapping.operator === TONE_MAPPING_OPERATOR.aces,
      );

      drawFullscreenQuad(renderContext, toneMapMaterial);

      copyTexture(scratchTarget.colorTexture, renderTarget);
    },
    cleanupEntities: (result) => {
      const [camera] = result.components;
      const { renderTarget } = camera;

      if (!renderTarget) {
        return;
      }

      scratchTargetByTarget.get(renderTarget)?.dispose(gl);
      scratchTargetByTarget.delete(renderTarget);
    },
  };
};
