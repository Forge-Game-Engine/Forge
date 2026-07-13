import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  BloomEcsComponent,
  bloomId,
  CameraEcsComponent,
  cameraId,
} from '../components/index.js';
import {
  beginFullscreenReplacePass,
  drawFullscreenQuad,
} from '../fullscreen-pass.js';
import { Material } from '../materials/index.js';
import { PingPongTarget } from '../ping-pong-target.js';
import { RenderContext } from '../render-context.js';
import { createRenderTarget, RenderTarget } from '../render-target.js';

// The blur chain runs at a fraction of the camera's render target
// resolution: the blur shader's kernel only reaches a handful of texels per
// pass, so at full resolution a large canvas would need far more passes for
// the glow to spread noticeably beyond its source pixels. Downsampling
// first means each texel already covers several source pixels, so the same
// kernel and pass count produce a much wider, softer glow, for a fraction
// of the fragment shader cost to boot.
const bloomDownsampleFactor = 4;

const downsampledSize = (size: number): number =>
  Math.max(1, Math.round(size / bloomDownsampleFactor));

// Shared, read-only direction constants for the two blur passes: passed
// straight through as the `u_direction` uniform's `Float32Array` value, so
// a pass never allocates a new vector (or, via `Material.bind`, a new
// `Float32Array` conversion of one) on every one of `passes` iterations.
const horizontalBlurDirection = new Float32Array([1, 0]);
const verticalBlurDirection = new Float32Array([0, 1]);

/**
 * Creates a bloom post-processing system: an additive glow around the
 * brightest parts of the scene.
 *
 * For each camera with both a `renderTarget` and a `BloomEcsComponent`,
 * extracts the pixels brighter than `threshold` into a downsampled scratch
 * buffer, blurs them with the same separable technique as
 * `createGaussianBlurEcsSystem`, then adds the blurred result back onto the
 * camera's `renderTarget`. Cameras without a `renderTarget`, or without a
 * `BloomEcsComponent` (attach one with `addBloom`), are left untouched.
 *
 * Must be registered after the render system (so there's a scene to bloom)
 * and before the present system (so the result gets drawn to the canvas).
 * If a camera also has a `GaussianBlurEcsComponent`, register this system
 * before the blur system, so the glow gets softened along with the rest of
 * the scene rather than sharpening it back up afterwards.
 * @param renderContext The rendering context
 * @returns The bloom ECS system
 */
export const createBloomEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraEcsComponent, BloomEcsComponent], void, void> => {
  const { gl, shaderCache } = renderContext;

  const thresholdMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('bloom-threshold.frag'),
    gl,
  );
  const blurMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('gaussian-blur.frag'),
    gl,
  );
  const compositeMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('bloom-composite.frag'),
    gl,
  );
  const copyMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('passthrough.frag'),
    gl,
  );

  // Scratch GPU resources, one entry per distinct `renderTarget` in use by a
  // bloomed camera, recreated on resize. `brightTarget` and `pingPong` are
  // downsampled (see `bloomDownsampleFactor`); `compositeTarget` matches the
  // camera's `renderTarget` resolution, since the composite pass's output
  // replaces that target's contents. Owned by this system (not module-level
  // state) and disposed via `cleanupEntities` when the world stops.
  const brightTargetByTarget = new WeakMap<RenderTarget, RenderTarget>();
  const pingPongByTarget = new WeakMap<RenderTarget, PingPongTarget>();
  const compositeTargetByTarget = new WeakMap<RenderTarget, RenderTarget>();

  const getBrightTarget = (target: RenderTarget): RenderTarget => {
    const width = downsampledSize(target.width);
    const height = downsampledSize(target.height);
    const existing = brightTargetByTarget.get(target);
    const isStale =
      existing !== undefined &&
      (existing.width !== width || existing.height !== height);

    if (existing && !isStale) {
      return existing;
    }

    if (existing) {
      existing.dispose(gl);
    }

    const brightTarget = createRenderTarget(gl, width, height, target.format);

    brightTargetByTarget.set(target, brightTarget);

    return brightTarget;
  };

  const getPingPongTarget = (target: RenderTarget): PingPongTarget => {
    const width = downsampledSize(target.width);
    const height = downsampledSize(target.height);
    const existing = pingPongByTarget.get(target);
    const isStale =
      existing !== undefined &&
      (existing.read.width !== width || existing.read.height !== height);

    if (existing && !isStale) {
      return existing;
    }

    if (existing) {
      existing.dispose(gl);
    }

    const pingPong = new PingPongTarget(gl, width, height, target.format);

    pingPongByTarget.set(target, pingPong);

    return pingPong;
  };

  const getCompositeTarget = (target: RenderTarget): RenderTarget => {
    const existing = compositeTargetByTarget.get(target);
    const isStale =
      existing !== undefined &&
      (existing.width !== target.width || existing.height !== target.height);

    if (existing && !isStale) {
      return existing;
    }

    if (existing) {
      existing.dispose(gl);
    }

    const compositeTarget = createRenderTarget(
      gl,
      target.width,
      target.height,
      target.format,
    );

    compositeTargetByTarget.set(target, compositeTarget);

    return compositeTarget;
  };

  const drawBlurPass = (
    sourceTexture: WebGLTexture,
    direction: Float32Array,
    texelSize: Float32Array,
    destination: RenderTarget,
  ): void => {
    beginFullscreenReplacePass(renderContext, destination);

    blurMaterial.setUniform('u_texture', sourceTexture);
    blurMaterial.setUniform('u_direction', direction);
    blurMaterial.setUniform('u_texelSize', texelSize);

    drawFullscreenQuad(renderContext, blurMaterial);
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
    query: [cameraId, bloomId],
    beforeQuery: () => {
      processedTargetsThisFrame.clear();
    },
    run: (result) => {
      const [camera, bloom] = result.components;
      const { renderTarget } = camera;
      const intensity = Math.max(0, bloom.intensity);

      if (
        !renderTarget ||
        intensity <= 0 ||
        processedTargetsThisFrame.has(renderTarget)
      ) {
        return;
      }

      processedTargetsThisFrame.add(renderTarget);

      const brightTarget = getBrightTarget(renderTarget);

      beginFullscreenReplacePass(renderContext, brightTarget);

      thresholdMaterial.setUniform('u_texture', renderTarget.colorTexture);
      thresholdMaterial.setUniform('u_threshold', bloom.threshold);
      thresholdMaterial.setUniform(
        'u_texelSize',
        new Float32Array([1 / renderTarget.width, 1 / renderTarget.height]),
      );

      drawFullscreenQuad(renderContext, thresholdMaterial);

      const pingPong = getPingPongTarget(renderTarget);
      const texelSize = new Float32Array([
        1 / brightTarget.width,
        1 / brightTarget.height,
      ]);

      // Same two-pass separable technique as createGaussianBlurEcsSystem:
      // each iteration reads the previous iteration's result back out of
      // `brightTarget` and writes the next, more-blurred version back into
      // it, so `passes` composes into a wider glow. Running at the
      // downsampled resolution (see `bloomDownsampleFactor`) is what makes
      // that glow actually reach past a sprite's edges instead of staying
      // pinned to its source pixels.
      for (let i = 0; i < bloom.passes; i++) {
        drawBlurPass(
          brightTarget.colorTexture,
          horizontalBlurDirection,
          texelSize,
          pingPong.write,
        );
        pingPong.swap();

        drawBlurPass(
          pingPong.read.colorTexture,
          verticalBlurDirection,
          texelSize,
          brightTarget,
        );
      }

      // The composite pass upsamples `brightTarget` back to full resolution
      // implicitly, via the bloom texture's own linear-filtered sampling.
      // It writes into its own full-resolution scratch buffer rather than
      // `pingPong` (now downsampled) or `renderTarget` (the scene texture
      // it's reading from, which can't also be this draw's destination).
      const compositeTarget = getCompositeTarget(renderTarget);

      beginFullscreenReplacePass(renderContext, compositeTarget);

      compositeMaterial.setUniform('u_sceneTexture', renderTarget.colorTexture);
      compositeMaterial.setUniform('u_bloomTexture', brightTarget.colorTexture);
      compositeMaterial.setUniform('u_intensity', intensity);

      drawFullscreenQuad(renderContext, compositeMaterial);

      copyTexture(compositeTarget.colorTexture, renderTarget);
    },
    cleanupEntities: (result) => {
      const [camera] = result.components;
      const { renderTarget } = camera;

      if (!renderTarget) {
        return;
      }

      brightTargetByTarget.get(renderTarget)?.dispose(gl);
      brightTargetByTarget.delete(renderTarget);

      pingPongByTarget.get(renderTarget)?.dispose(gl);
      pingPongByTarget.delete(renderTarget);

      compositeTargetByTarget.get(renderTarget)?.dispose(gl);
      compositeTargetByTarget.delete(renderTarget);
    },
  };
};
