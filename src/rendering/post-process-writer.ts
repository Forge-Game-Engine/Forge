import {
  beginFullscreenReplacePass,
  drawFullscreenQuad,
} from './fullscreen-pass.js';
import { Material } from './materials/index.js';
import { RenderContext } from './render-context.js';
import { createRenderTarget, RenderTarget } from './render-target.js';

/**
 * Draws one full-screen pass of {@link PostProcessWriter.write}. The writer
 * has already bound and cleared the pass's destination; set the pass's
 * uniforms, sampling `source` for the target's current contents, and draw
 * (e.g. with `drawFullscreenQuad`).
 * @param source - The target's contents as of the previous pass. Never the
 * texture being drawn into.
 * @param passIndex - Which pass this is, from `0`.
 */
export type DrawPostProcessPass = (
  source: WebGLTexture,
  passIndex: number,
) => void;

/**
 * Runs full-screen passes that read a render target and write their result
 * back into it, the way every post-processing effect on a camera's
 * `renderTarget` works. A draw can't sample the texture it's drawing into,
 * so the writer keeps a scratch target per render target (matching its size
 * and format, recreated when it resizes) and alternates between the two:
 * the first pass reads the target and writes the scratch, the second reads
 * the scratch and writes the target, and so on. An odd number of passes
 * ends with one copy back into the target.
 *
 * Each post-processing system owns one writer and disposes it in its
 * `cleanup`.
 */
export class PostProcessWriter {
  private readonly _renderContext: RenderContext;
  private readonly _copyMaterial: Material;
  private readonly _scratchTargets = new Map<RenderTarget, RenderTarget>();

  /**
   * Creates a writer for passes drawn with `renderContext`.
   * @param renderContext - The rendering context the passes draw with.
   */
  constructor(renderContext: RenderContext) {
    const { gl, shaderCache } = renderContext;

    this._renderContext = renderContext;
    this._copyMaterial = new Material(
      shaderCache.getShader('passthrough.vert'),
      shaderCache.getShader('passthrough.frag'),
      gl,
    );
  }

  /**
   * Runs `passCount` passes over `target`, each drawn by `drawPass`, leaving
   * the last pass's output in `target`. Does nothing for a `passCount` of 0.
   * @param target - The render target to process in place.
   * @param passCount - How many passes to run.
   * @param drawPass - Draws each pass. See {@link DrawPostProcessPass}.
   */
  public write(
    target: RenderTarget,
    passCount: number,
    drawPass: DrawPostProcessPass,
  ): void {
    if (passCount <= 0) {
      return;
    }

    const scratchTarget = this._getScratchTarget(target);
    let source = target;
    let destination = scratchTarget;

    for (let passIndex = 0; passIndex < passCount; passIndex++) {
      beginFullscreenReplacePass(this._renderContext, destination);
      drawPass(source.colorTexture, passIndex);

      [source, destination] = [destination, source];
    }

    if (source === scratchTarget) {
      beginFullscreenReplacePass(this._renderContext, target);
      this._copyMaterial.setUniform('u_texture', scratchTarget.colorTexture);
      drawFullscreenQuad(this._renderContext, this._copyMaterial);
    }
  }

  /**
   * Frees every scratch target the writer has made. The writer can still be
   * used afterwards; it makes new ones as needed.
   */
  public dispose(): void {
    for (const scratchTarget of this._scratchTargets.values()) {
      scratchTarget.dispose(this._renderContext.gl);
    }

    this._scratchTargets.clear();
  }

  private _getScratchTarget(target: RenderTarget): RenderTarget {
    const { gl } = this._renderContext;
    const existing = this._scratchTargets.get(target);

    if (
      existing &&
      existing.width === target.width &&
      existing.height === target.height
    ) {
      return existing;
    }

    existing?.dispose(gl);

    const scratchTarget = createRenderTarget(
      gl,
      target.width,
      target.height,
      target.format,
    );

    this._scratchTargets.set(target, scratchTarget);

    return scratchTarget;
  }
}
