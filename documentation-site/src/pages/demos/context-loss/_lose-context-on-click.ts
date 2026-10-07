import { RenderContext } from '@forge-game-engine/forge/rendering';

const restoreDelayInMilliseconds = 1500;

/**
 * Loses the WebGL context when the canvas is clicked, the way a GPU reset
 * would, and restores it a moment later. `WEBGL_lose_context` exists for
 * testing exactly this.
 */
export function loseContextOnClick(renderContext: RenderContext): void {
  // Fetched up front: `getExtension` returns `null` while the context is
  // lost.
  const loseContextExtension =
    renderContext.gl.getExtension('WEBGL_lose_context');

  if (!loseContextExtension) {
    throw new Error('WEBGL_lose_context is not available.');
  }

  renderContext.canvas.addEventListener('click', () => {
    if (renderContext.isContextLost) {
      return;
    }

    loseContextExtension.loseContext();

    setTimeout(() => {
      loseContextExtension.restoreContext();
    }, restoreDelayInMilliseconds);
  });

  // A game that runs out of GPU memory can come back at a lower
  // resolution. It applies when the context is restored.
  renderContext.onContextLost.registerListener(() => {
    console.info('WebGL context lost');
    renderContext.maxPixelRatio = Math.max(1, renderContext.pixelRatio - 1);
  });

  renderContext.onContextRestored.registerListener(() => {
    console.info(
      `WebGL context restored at a pixel ratio of ${renderContext.pixelRatio}`,
    );
  });
}
