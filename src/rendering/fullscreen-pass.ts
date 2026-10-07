import { Material } from './materials/index.js';
import { RenderContext } from './render-context.js';
import { RenderTarget } from './render-target.js';
import type { Texture } from './texture.js';

/**
 * Binds `destination` (or the canvas if `null`) as the current draw target,
 * clears it, and disables blending. Shared by post-processing and present
 * passes that fully replace a destination's contents with a full-screen
 * draw: blending must be off first, since a full-screen pass replaces every
 * pixel and must not blend with whatever was already there (blending is
 * left enabled as global GL state by the render system's sprite drawing).
 * @param renderContext - The rendering context.
 * @param destination - The render target to draw into, or `null` for the canvas.
 */
export function beginFullscreenReplacePass(
  renderContext: RenderContext,
  destination: RenderTarget | null,
): void {
  renderContext.bindRenderTarget(destination);
  renderContext.clear();
  renderContext.gl.disable(renderContext.gl.BLEND);
}

/**
 * Starts a post-processing pass over `target`: makes `target`'s other color
 * buffer current (allocating it on first use), binds and clears it, disables
 * blending, and returns the texture that was current before, holding
 * `target`'s latest contents, for the pass to read.
 *
 * A full-screen pass can't sample the texture it draws into, so each pass
 * reads one of the target's two buffers and writes the other, with no copy
 * back afterwards. The pass must write every pixel of `target`: whatever it
 * leaves unwritten is lost. Read the returned texture, never
 * `target.colorTexture`, which is already the buffer being drawn into.
 * @param renderContext - The rendering context.
 * @param target - The render target to process, usually a camera's
 * `renderTarget`.
 * @returns The color texture holding `target`'s contents before this pass.
 * @throws An error if the second buffer's framebuffer is not complete.
 */
export function beginPostProcessPass(
  renderContext: RenderContext,
  target: RenderTarget,
): Texture {
  const source = target.swapBuffers();

  beginFullscreenReplacePass(renderContext, target);

  return source;
}

/**
 * Draws a full-screen quad with `material`, whose uniforms must already be
 * set. Shared by every pass that samples a texture and draws it directly
 * (post-processing passes, presenting a render target onto the canvas):
 * these differ only in which material, uniforms, and destination they use,
 * not in how the draw call itself is issued. Draws nothing while the WebGL
 * context is lost (see `RenderContext.isContextLost`).
 * @param renderContext - The rendering context.
 * @param material - The material to draw with.
 */
export function drawFullscreenQuad(
  renderContext: RenderContext,
  material: Material,
): void {
  if (renderContext.isContextLost) {
    return;
  }

  const { gl } = renderContext;

  material.bind(gl);
  renderContext.quadGeometry.bind(material);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
