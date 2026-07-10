import { Vector2 } from '../../math/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  CameraEcsComponent,
  cameraId,
  GaussianBlurEcsComponent,
  gaussianBlurId,
} from '../components/index.js';
import {
  beginFullscreenReplacePass,
  drawFullscreenQuad,
} from '../fullscreen-pass.js';
import { Material } from '../materials/index.js';
import { PingPongTarget } from '../ping-pong-target.js';
import { RenderContext } from '../render-context.js';
import { createRenderTarget, RenderTarget } from '../render-target.js';

/**
 * Creates a two-pass separable Gaussian blur post-processing system.
 *
 * For each camera with both a `renderTarget` and a `GaussianBlurEcsComponent`,
 * blurs that target's contents in place: a horizontal pass renders into an
 * internal scratch buffer, then a vertical pass reads that scratch buffer
 * and renders the result back into the camera's `renderTarget`. Cameras
 * without a `renderTarget`, or without a `GaussianBlurEcsComponent`
 * (attach one with `addGaussianBlur`), are left untouched.
 *
 * Must be registered after the render system (so there's a scene to blur)
 * and before the present system (so the blurred result gets drawn to the
 * canvas).
 * @param renderContext The rendering context
 * @returns The Gaussian blur ECS system
 */
export const createGaussianBlurEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[CameraEcsComponent, GaussianBlurEcsComponent], void, void> => {
  const { gl, shaderCache, programCache } = renderContext;

  const blurMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('gaussian-blur.frag'),
    gl,
    programCache,
  );
  const copyMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('passthrough.frag'),
    gl,
    programCache,
  );
  const crossFadeMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('cross-fade.frag'),
    gl,
    programCache,
  );

  // Scratch GPU resources, one entry per distinct `renderTarget` in use by a
  // blurred camera, sized to match it and recreated on resize. Owned by this
  // system (not module-level state) and disposed via `cleanupEntities` when
  // the world stops.
  const pingPongByTarget = new WeakMap<RenderTarget, PingPongTarget>();
  const sharpSnapshotByTarget = new WeakMap<RenderTarget, RenderTarget>();

  const getPingPongTarget = (target: RenderTarget): PingPongTarget => {
    const existing = pingPongByTarget.get(target);
    const isStale =
      existing !== undefined &&
      (existing.read.width !== target.width ||
        existing.read.height !== target.height);

    if (existing && !isStale) {
      return existing;
    }

    if (existing) {
      existing.dispose(gl);
    }

    const pingPong = new PingPongTarget(gl, target.width, target.height);

    pingPongByTarget.set(target, pingPong);

    return pingPong;
  };

  const getSharpSnapshotTarget = (target: RenderTarget): RenderTarget => {
    const existing = sharpSnapshotByTarget.get(target);
    const isStale =
      existing !== undefined &&
      (existing.width !== target.width || existing.height !== target.height);

    if (existing && !isStale) {
      return existing;
    }

    if (existing) {
      existing.dispose(gl);
    }

    const snapshot = createRenderTarget(gl, target.width, target.height);

    sharpSnapshotByTarget.set(target, snapshot);

    return snapshot;
  };

  const drawPass = (
    material: Material,
    sourceTexture: WebGLTexture,
    direction: Vector2,
    texelSize: Vector2,
    destination: RenderTarget,
  ): void => {
    beginFullscreenReplacePass(renderContext, destination);

    material.setUniform('u_texture', sourceTexture);
    material.setUniform('u_direction', direction);
    material.setUniform('u_texelSize', texelSize);

    drawFullscreenQuad(renderContext, material);
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
    query: [cameraId, gaussianBlurId],
    beforeQuery: () => {
      processedTargetsThisFrame.clear();
    },
    run: (result) => {
      const [camera, blur] = result.components;
      const { renderTarget } = camera;
      const intensity = Math.min(1, Math.max(0, blur.intensity));

      if (
        !renderTarget ||
        intensity <= 0 ||
        processedTargetsThisFrame.has(renderTarget)
      ) {
        return;
      }

      processedTargetsThisFrame.add(renderTarget);

      const needsBlend = intensity < 1;
      const sharpSnapshot = needsBlend
        ? getSharpSnapshotTarget(renderTarget)
        : null;

      if (sharpSnapshot) {
        copyTexture(renderTarget.colorTexture, sharpSnapshot);
      }

      const pingPong = getPingPongTarget(renderTarget);
      const texelSize = new Vector2(
        1 / renderTarget.width,
        1 / renderTarget.height,
      );

      // Each iteration reads the previous iteration's result back out of
      // `renderTarget` (itself, for the first iteration, the freshly
      // rendered scene) and writes the next, more-blurred version back
      // into it, so `passes` composes into a wider blur without ever
      // widening the individual 9-tap kernel.
      for (let i = 0; i < blur.passes; i++) {
        drawPass(
          blurMaterial,
          renderTarget.colorTexture,
          new Vector2(1, 0),
          texelSize,
          pingPong.write,
        );
        pingPong.swap();

        drawPass(
          blurMaterial,
          pingPong.read.colorTexture,
          new Vector2(0, 1),
          texelSize,
          renderTarget,
        );
      }

      if (!sharpSnapshot) {
        return;
      }

      // Cross-fade the untouched sharp snapshot into the fully-blurred
      // result, into a scratch buffer (safe to reuse now that the loop
      // above is done with it), then copy that blend back into
      // `renderTarget`, since consumers (like the present system) always
      // read the blur's output from there.
      beginFullscreenReplacePass(renderContext, pingPong.write);

      crossFadeMaterial.setUniform('u_fromTexture', sharpSnapshot.colorTexture);
      crossFadeMaterial.setUniform('u_toTexture', renderTarget.colorTexture);
      crossFadeMaterial.setUniform('u_factor', intensity);

      drawFullscreenQuad(renderContext, crossFadeMaterial);

      copyTexture(pingPong.write.colorTexture, renderTarget);
    },
    cleanupEntities: (result) => {
      const [camera] = result.components;
      const { renderTarget } = camera;

      if (!renderTarget) {
        return;
      }

      pingPongByTarget.get(renderTarget)?.dispose(gl);
      pingPongByTarget.delete(renderTarget);

      sharpSnapshotByTarget.get(renderTarget)?.dispose(gl);
      sharpSnapshotByTarget.delete(renderTarget);
    },
  };
};
