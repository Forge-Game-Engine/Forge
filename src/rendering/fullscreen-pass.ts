import { createQuadGeometry } from './geometry/index.js';
import { Material } from './materials/index.js';
import { RenderContext } from './render-context.js';
import { RenderTarget } from './render-target.js';

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
 * Draws a full-screen quad with `material`, whose uniforms must already be
 * set. Shared by every pass that samples a texture and draws it directly
 * (post-processing passes, presenting a render target onto the canvas):
 * these differ only in which material, uniforms, and destination they use,
 * not in how the draw call itself is issued.
 * @param renderContext - The rendering context.
 * @param material - The material to draw with.
 */
export function drawFullscreenQuad(
  renderContext: RenderContext,
  material: Material,
): void {
  const { gl } = renderContext;
  const geometry = createQuadGeometry(gl);

  material.bind(gl);
  geometry.bind(gl, material.program);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
