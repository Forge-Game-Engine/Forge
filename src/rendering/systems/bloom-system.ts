import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  BloomEcsComponent,
  bloomId,
  CameraEcsComponent,
  cameraId,
} from '../components/index.js';
import {
  beginFullscreenReplacePass,
  beginPostProcessPass,
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
//
// Measured in CSS pixels, not render-target (device) pixels: each
// downsampled texel covers this many CSS pixels square, whatever the
// display's pixel ratio. In device pixels, a small bright sprite would fill
// more of each block on a HiDPI display (so its glow starts brighter) and
// the blur would step half as far on screen (so the glow is shorter),
// making the same settings look different on every display.
const bloomDownsampleFactor = 4;

/**
 * The width (and height) in render-target texels of the block each
 * downsampled bright-pass texel covers: `bloomDownsampleFactor` CSS pixels,
 * converted to device pixels and rounded to a whole number of texels.
 * @param pixelRatio - The render context's device pixels per CSS pixel.
 * @returns The block size in render-target texels, at least 1.
 */
const downsampleBlockSize = (pixelRatio: number): number =>
  Math.max(1, Math.round(bloomDownsampleFactor * pixelRatio));

const downsampledSize = (size: number, blockSize: number): number =>
  Math.max(1, Math.round(size / blockSize));

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
 * camera's `renderTarget` in a post-processing pass (see
 * `beginPostProcessPass`). Cameras without a `renderTarget`, or without a
 * `BloomEcsComponent` (attach one with `addBloomComponent`), are left
 * untouched, and so are cameras whose bloom has `passes` or `intensity` at
 * `0` or below.
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
): EcsSystem<[CameraEcsComponent, BloomEcsComponent]> => {
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

  // Scratch GPU resources, one entry per distinct `renderTarget` in use by a
  // bloomed camera, recreated on resize. Both are downsampled (see
  // `bloomDownsampleFactor`); the composite pass writes into the camera's
  // own `renderTarget` through `beginPostProcessPass`. Owned by this system
  // (not module-level state) and disposed via `cleanup` when the world
  // stops.
  const brightTargetByTarget = new WeakMap<RenderTarget, RenderTarget>();
  const pingPongByTarget = new WeakMap<RenderTarget, PingPongTarget>();

  const getBrightTarget = (
    target: RenderTarget,
    blockSize: number,
  ): RenderTarget => {
    const width = downsampledSize(target.width, blockSize);
    const height = downsampledSize(target.height, blockSize);
    const existing = brightTargetByTarget.get(target);
    const isStale =
      existing !== undefined &&
      (existing.width !== width || existing.height !== height);

    if (existing && !isStale) {
      return existing;
    }

    if (existing) {
      existing.dispose();
    }

    const brightTarget = createRenderTarget(
      renderContext,
      { width, height },
      target.format,
    );

    brightTargetByTarget.set(target, brightTarget);

    return brightTarget;
  };

  const getPingPongTarget = (
    target: RenderTarget,
    blockSize: number,
  ): PingPongTarget => {
    const width = downsampledSize(target.width, blockSize);
    const height = downsampledSize(target.height, blockSize);
    const existing = pingPongByTarget.get(target);
    const isStale =
      existing !== undefined &&
      (existing.read.width !== width || existing.read.height !== height);

    if (existing && !isStale) {
      return existing;
    }

    if (existing) {
      existing.dispose();
    }

    const pingPong = new PingPongTarget(
      renderContext,
      { width, height },
      target.format,
    );

    pingPongByTarget.set(target, pingPong);

    return pingPong;
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

  const processedTargetsThisFrame = new Set<RenderTarget>();

  return {
    query: [cameraId, bloomId],
    update: (_world, { components: [cameras, blooms] }) => {
      processedTargetsThisFrame.clear();

      for (let i = 0; i < cameras.length; i++) {
        const camera = cameras[i];
        const bloom = blooms[i];
        const { renderTarget } = camera;
        const intensity = Math.max(0, bloom.intensity);

        if (
          !renderTarget ||
          intensity <= 0 ||
          bloom.passes <= 0 ||
          processedTargetsThisFrame.has(renderTarget)
        ) {
          continue;
        }

        processedTargetsThisFrame.add(renderTarget);

        const { pixelRatio } = renderContext;
        const blockSize = downsampleBlockSize(pixelRatio);
        const brightTarget = getBrightTarget(renderTarget, blockSize);

        beginFullscreenReplacePass(renderContext, brightTarget);

        thresholdMaterial.setUniform('u_texture', renderTarget.colorTexture);
        thresholdMaterial.setUniform('u_threshold', bloom.threshold);
        thresholdMaterial.setUniform('u_blockSize', blockSize);
        thresholdMaterial.setUniform(
          'u_texelSize',
          new Float32Array([1 / renderTarget.width, 1 / renderTarget.height]),
        );

        drawFullscreenQuad(renderContext, thresholdMaterial);

        const pingPong = getPingPongTarget(renderTarget, blockSize);
        // One kernel step per `bloomDownsampleFactor` CSS pixels, computed
        // from the full-resolution target rather than `brightTarget`'s own
        // size, so rounding `blockSize` to whole texels doesn't change how
        // far the glow reaches on screen (at a pixel ratio of 1.1, say, a
        // block is 4 texels but `bloomDownsampleFactor` CSS pixels is 4.4).
        const texelSize = new Float32Array([
          (bloomDownsampleFactor * pixelRatio) / renderTarget.width,
          (bloomDownsampleFactor * pixelRatio) / renderTarget.height,
        ]);

        // Same two-pass separable technique as createGaussianBlurEcsSystem:
        // each iteration reads the previous iteration's result back out of
        // `brightTarget` and writes the next, more-blurred version back into
        // it, so `passes` composes into a wider glow. Running at the
        // downsampled resolution (see `bloomDownsampleFactor`) is what makes
        // that glow actually reach past a sprite's edges instead of staying
        // pinned to its source pixels.
        for (let p = 0; p < bloom.passes; p++) {
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
        const scene = beginPostProcessPass(renderContext, renderTarget);

        compositeMaterial.setUniform('u_sceneTexture', scene);
        compositeMaterial.setUniform(
          'u_bloomTexture',
          brightTarget.colorTexture,
        );
        compositeMaterial.setUniform('u_intensity', intensity);

        drawFullscreenQuad(renderContext, compositeMaterial);
      }
    },
    cleanup: (world) => {
      const {
        components: [cameras],
      } = world.query<[CameraEcsComponent]>([cameraId, bloomId]);

      for (const camera of cameras) {
        const { renderTarget } = camera;

        if (!renderTarget) {
          continue;
        }

        brightTargetByTarget.get(renderTarget)?.dispose();
        brightTargetByTarget.delete(renderTarget);

        pingPongByTarget.get(renderTarget)?.dispose();
        pingPongByTarget.delete(renderTarget);
      }
    },
  };
};
