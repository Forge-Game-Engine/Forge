import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  CameraEcsComponent,
  cameraId,
  GaussianBlurEcsComponent,
  gaussianBlurId,
} from '../components/index.js';
import {
  beginFullscreenReplacePass,
  beginPostProcessPass,
  drawFullscreenQuad,
} from '../fullscreen-pass.js';
import { Material } from '../materials/index.js';
import { PingPongTarget } from '../ping-pong-target.js';
import { RenderContext } from '../render-context.js';
import { RenderTarget } from '../render-target.js';

// Shared, read-only direction constants for the two blur passes: passed
// straight through as the `u_direction` uniform's `Float32Array` value, so
// a pass never allocates a new vector (or, via `Material.bind`, a new
// `Float32Array` conversion of one) on every one of `passes` iterations.
const horizontalBlurDirection = new Float32Array([1, 0]);
const verticalBlurDirection = new Float32Array([0, 1]);

/**
 * Creates a two-pass separable Gaussian blur post-processing system.
 *
 * For each camera with both a `renderTarget` and a `GaussianBlurEcsComponent`,
 * blurs that target's contents in place: each pass is a horizontal then a
 * vertical blur through internal scratch buffers, and the last pass renders
 * the result back into the camera's `renderTarget`. Cameras without a
 * `renderTarget`, or without a `GaussianBlurEcsComponent` (attach one with
 * `addGaussianBlurComponent`), are left untouched.
 *
 * The blur is sized in CSS pixels, so the same `passes` look the same on
 * every display: on a high-DPI display (`RenderContext.pixelRatio` above
 * `1`) the scene is first averaged down to CSS-pixel resolution, blurred
 * there, and scaled back up by the last pass.
 *
 * Must be registered after the render system (so there's a scene to blur)
 * and before the present system (so the blurred result gets drawn to the
 * canvas).
 * @param renderContext The rendering context
 * @returns The Gaussian blur ECS system
 */
export const createGaussianBlurEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraEcsComponent, GaussianBlurEcsComponent]> => {
  const { gl, shaderCache } = renderContext;

  const blurMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('gaussian-blur.frag'),
    gl,
  );
  const downsampleMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('box-downsample.frag'),
    gl,
  );
  const crossFadeMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('cross-fade.frag'),
    gl,
  );

  // Scratch GPU resource, one entry per distinct `renderTarget` in use by a
  // blurred camera, recreated on resize: the blur chain, at CSS-pixel
  // resolution (see `blurPasses`). Owned by this system (not module-level
  // state) and disposed via `cleanup` when the world stops.
  const pingPongByTarget = new WeakMap<RenderTarget, PingPongTarget>();

  const getPingPongTarget = (
    target: RenderTarget,
    width: number,
    height: number,
  ): PingPongTarget => {
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

  const drawPass = (
    material: Material,
    sourceTexture: WebGLTexture,
    direction: Float32Array,
    texelSize: Float32Array,
    destination: RenderTarget,
  ): void => {
    beginFullscreenReplacePass(renderContext, destination);

    material.setUniform('u_texture', sourceTexture);
    material.setUniform('u_direction', direction);
    material.setUniform('u_texelSize', texelSize);

    drawFullscreenQuad(renderContext, material);
  };

  const downsample = (
    source: RenderTarget,
    blockSize: number,
    destination: RenderTarget,
  ): void => {
    beginFullscreenReplacePass(renderContext, destination);

    downsampleMaterial.setUniform('u_texture', source.colorTexture);
    downsampleMaterial.setUniform('u_blockSize', blockSize);
    downsampleMaterial.setUniform(
      'u_texelSize',
      new Float32Array([1 / source.width, 1 / source.height]),
    );

    drawFullscreenQuad(renderContext, downsampleMaterial);
  };

  /**
   * Runs `passes` horizontal+vertical blur pairs over `renderTarget`.
   * @param renderTarget - The camera's render target, holding the scene to blur.
   * @param passes - How many blur pairs to run, at least 1.
   * @param keepSharpScene - Whether `renderTarget` must keep the sharp scene,
   * for a cross-fade afterwards. If so, the blurred result is left in the
   * returned ping-pong pair's `read` target instead of `renderTarget`.
   * @returns The ping-pong pair the blur ran through.
   */
  const blurPasses = (
    renderTarget: RenderTarget,
    passes: number,
    keepSharpScene: boolean,
  ): PingPongTarget => {
    // The 9-tap kernel steps one CSS pixel per tap, not one render-target
    // texel: the target is sized in device pixels, so a texel step would
    // blur half as far on screen at a pixel ratio of 2 as at 1. Stepping a
    // CSS pixel across a device-pixel texture would skip the texels in
    // between, though (at a ratio of 2, odd and even columns would never
    // mix, striping thin details), so on a high-DPI display the blur chain
    // runs on a copy averaged down to CSS-pixel resolution instead, where
    // one CSS pixel is one texel again. The last pass's linear-filtered
    // sampling scales it back up.
    const { pixelRatio } = renderContext;
    const downsampleScale = Math.max(1, pixelRatio);
    const pingPong = getPingPongTarget(
      renderTarget,
      Math.max(1, Math.round(renderTarget.width / downsampleScale)),
      Math.max(1, Math.round(renderTarget.height / downsampleScale)),
    );
    const isDownsampled =
      pingPong.read.width !== renderTarget.width ||
      pingPong.read.height !== renderTarget.height;
    const texelSize = new Float32Array([
      pixelRatio / renderTarget.width,
      pixelRatio / renderTarget.height,
    ]);

    if (isDownsampled) {
      downsample(
        renderTarget,
        Math.max(1, Math.round(downsampleScale)),
        pingPong.write,
      );
      pingPong.swap();
    }

    // Each iteration reads the previous iteration's result and writes the
    // next, more-blurred version, so `passes` composes into a wider blur
    // without ever widening the individual 9-tap kernel.
    for (let p = 0; p < passes; p++) {
      const source = p === 0 && !isDownsampled ? renderTarget : pingPong.read;

      drawPass(
        blurMaterial,
        source.colorTexture,
        horizontalBlurDirection,
        texelSize,
        pingPong.write,
      );
      pingPong.swap();

      // Picked only after the swap above: before it, `pingPong.write` is the
      // buffer the horizontal pass just wrote, which this pass reads from.
      // The last pass writes the camera's target directly, without
      // `beginPostProcessPass`: it reads only `pingPong.read`, never the
      // target, so there's nothing to swap away from.
      const isLastPass = p + 1 >= passes;
      const destination: RenderTarget =
        isLastPass && !keepSharpScene ? renderTarget : pingPong.write;

      drawPass(
        blurMaterial,
        pingPong.read.colorTexture,
        verticalBlurDirection,
        texelSize,
        destination,
      );

      if (destination !== renderTarget) {
        pingPong.swap();
      }
    }

    return pingPong;
  };

  /**
   * Cross-fades the still-sharp `renderTarget` into `blurred` (upsampled
   * implicitly by its linear-filtered sampling, if the blur ran
   * downsampled), in a post-processing pass over `renderTarget`.
   * @param renderTarget - The camera's render target, holding the sharp scene.
   * @param blurred - The fully-blurred scene.
   * @param intensity - How much of `blurred` to show, from `0` to `1`.
   */
  const crossFade = (
    renderTarget: RenderTarget,
    blurred: RenderTarget,
    intensity: number,
  ): void => {
    const sharp = beginPostProcessPass(renderContext, renderTarget);

    crossFadeMaterial.setUniform('u_fromTexture', sharp);
    crossFadeMaterial.setUniform('u_toTexture', blurred.colorTexture);
    crossFadeMaterial.setUniform('u_factor', intensity);

    drawFullscreenQuad(renderContext, crossFadeMaterial);
  };

  const processedTargetsThisFrame = new Set<RenderTarget>();

  return {
    query: [cameraId, gaussianBlurId],
    update: (_world, { components: [cameras, blurs] }) => {
      processedTargetsThisFrame.clear();

      for (let i = 0; i < cameras.length; i++) {
        const camera = cameras[i];
        const blur = blurs[i];
        const { renderTarget } = camera;
        const intensity = Math.min(1, Math.max(0, blur.intensity));

        if (
          !renderTarget ||
          intensity <= 0 ||
          blur.passes <= 0 ||
          processedTargetsThisFrame.has(renderTarget)
        ) {
          continue;
        }

        processedTargetsThisFrame.add(renderTarget);

        const needsBlend = intensity < 1;
        const pingPong = blurPasses(renderTarget, blur.passes, needsBlend);

        if (needsBlend) {
          crossFade(renderTarget, pingPong.read, intensity);
        }
      }
    },
    cleanup: (world) => {
      const {
        components: [cameras],
      } = world.query<[CameraEcsComponent]>([cameraId, gaussianBlurId]);

      for (const camera of cameras) {
        const { renderTarget } = camera;

        if (!renderTarget) {
          continue;
        }

        pingPongByTarget.get(renderTarget)?.dispose();
        pingPongByTarget.delete(renderTarget);
      }
    },
  };
};
