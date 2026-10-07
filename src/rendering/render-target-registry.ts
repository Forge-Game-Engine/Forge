import type { RenderContext } from './render-context.js';

/**
 * Reallocates a canvas-sized render target at its render context's current
 * drawing-buffer size.
 */
type FollowCanvas = () => void;

// The canvas-sized render targets of each render context, as the callbacks
// that resize them. Kept in a module of its own, which the package doesn't
// export, so only `RenderTarget` registers targets and only
// `RenderContext.resize` resizes them: a public method or event for it would
// let game code unhook (or reorder) the targets the render context owns the
// size of. A strong reference, until the target is disposed.
const canvasSizedTargetsByContext = new WeakMap<
  RenderContext,
  Set<FollowCanvas>
>();

/**
 * Registers a canvas-sized render target with its render context, so
 * `resizeCanvasSizedRenderTargets` resizes it.
 * @param renderContext - The render context the target belongs to.
 * @param followCanvas - Reallocates the target at `renderContext`'s size.
 */
export function registerCanvasSizedRenderTarget(
  renderContext: RenderContext,
  followCanvas: FollowCanvas,
): void {
  const targets = canvasSizedTargetsByContext.get(renderContext);

  if (targets) {
    targets.add(followCanvas);

    return;
  }

  canvasSizedTargetsByContext.set(renderContext, new Set([followCanvas]));
}

/**
 * Stops `resizeCanvasSizedRenderTargets` resizing a render target. Does
 * nothing for a target that was never registered.
 * @param renderContext - The render context the target belongs to.
 * @param followCanvas - The callback the target registered with.
 */
export function unregisterCanvasSizedRenderTarget(
  renderContext: RenderContext,
  followCanvas: FollowCanvas,
): void {
  canvasSizedTargetsByContext.get(renderContext)?.delete(followCanvas);
}

/**
 * Resizes every canvas-sized render target registered with `renderContext`
 * to its current drawing-buffer size.
 * @param renderContext - The render context that was just resized.
 */
export function resizeCanvasSizedRenderTargets(
  renderContext: RenderContext,
): void {
  const targets = canvasSizedTargetsByContext.get(renderContext);

  if (!targets) {
    return;
  }

  for (const followCanvas of targets) {
    followCanvas();
  }
}
