import { Vector2 } from '../../math/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  CameraEcsComponent,
  cameraId,
  GaussianBlurEcsComponent,
  gaussianBlurId,
} from '../components/index.js';
import { createFullscreenQuadGeometry } from '../geometry/index.js';
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
  const { gl, shaderCache } = renderContext;

  const horizontalMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('gaussian-blur.frag'),
    gl,
  );
  const verticalMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('gaussian-blur.frag'),
    gl,
  );
  const copyMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('passthrough.frag'),
    gl,
  );
  const mixMaterial = new Material(
    shaderCache.getShader('passthrough.vert'),
    shaderCache.getShader('blur-mix.frag'),
    gl,
  );

  const geometry = createFullscreenQuadGeometry(gl);
  const pingPongByTarget = new WeakMap<RenderTarget, PingPongTarget>();
  const sharpSnapshotByTarget = new WeakMap<RenderTarget, RenderTarget>();

  const getPingPongTarget = (target: RenderTarget): PingPongTarget => {
    const existing = pingPongByTarget.get(target);

    if (
      existing &&
      existing.read.width === target.width &&
      existing.read.height === target.height
    ) {
      return existing;
    }

    existing?.dispose(gl);

    const pingPong = new PingPongTarget(gl, target.width, target.height);

    pingPongByTarget.set(target, pingPong);

    return pingPong;
  };

  const getSharpSnapshotTarget = (target: RenderTarget): RenderTarget => {
    const existing = sharpSnapshotByTarget.get(target);

    if (
      existing &&
      existing.width === target.width &&
      existing.height === target.height
    ) {
      return existing;
    }

    existing?.dispose(gl);

    const snapshot = createRenderTarget(gl, target.width, target.height);

    sharpSnapshotByTarget.set(target, snapshot);

    return snapshot;
  };

  const bindForFullscreenDraw = (destination: RenderTarget): void => {
    renderContext.bindRenderTarget(destination);
    renderContext.clear();

    // A full-screen pass replaces every pixel of its destination, so it
    // must not blend with whatever was there before. Blending is left
    // enabled as global GL state by the render system's sprite drawing, and
    // blending a partially-transparent source (for example a background
    // layer under 1.0 alpha) onto a freshly-cleared, fully-transparent
    // destination multiplies its alpha down every pass, fading it toward
    // black over repeated passes.
    gl.disable(gl.BLEND);
  };

  const drawPass = (
    material: Material,
    sourceTexture: WebGLTexture,
    direction: Vector2,
    texelSize: Vector2,
    destination: RenderTarget,
  ): void => {
    bindForFullscreenDraw(destination);

    material.setUniform('u_texture', sourceTexture);
    material.setUniform('u_direction', direction);
    material.setUniform('u_texelSize', texelSize);

    material.bind(gl);
    geometry.bind(gl, material.program);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  const copyTexture = (
    sourceTexture: WebGLTexture,
    destination: RenderTarget,
  ): void => {
    bindForFullscreenDraw(destination);

    copyMaterial.setUniform('u_texture', sourceTexture);

    copyMaterial.bind(gl);
    geometry.bind(gl, copyMaterial.program);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
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
          horizontalMaterial,
          renderTarget.colorTexture,
          new Vector2(1, 0),
          texelSize,
          pingPong.write,
        );
        pingPong.swap();

        drawPass(
          verticalMaterial,
          pingPong.read.colorTexture,
          new Vector2(0, 1),
          texelSize,
          renderTarget,
        );
      }

      if (!sharpSnapshot) {
        return;
      }

      // Blend the untouched sharp snapshot with the fully-blurred result
      // into a scratch buffer (safe to reuse now that the loop above is
      // done with it), then copy that blend back into `renderTarget`,
      // since consumers (like the present system) always read the blur's
      // output from there.
      bindForFullscreenDraw(pingPong.write);

      mixMaterial.setUniform('u_sharpTexture', sharpSnapshot.colorTexture);
      mixMaterial.setUniform('u_blurredTexture', renderTarget.colorTexture);
      mixMaterial.setUniform('u_intensity', intensity);

      mixMaterial.bind(gl);
      geometry.bind(gl, mixMaterial.program);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      copyTexture(pingPong.write.colorTexture, renderTarget);
    },
  };
};
