import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { RenderContext, RenderTarget } from '@forge-game-engine/forge/rendering';

/**
 * Creates a system that keeps `renderTargets` sized to `renderContext`.
 * `Game` resizes `renderContext` itself as its container's size changes (see
 * the "Resizing" section of the Game doc), but a `RenderTarget` a camera
 * renders into is a plain, fixed-size texture that stays completely
 * unaware of that - see the "Rendering a camera off-screen" caution in the
 * Multipass Rendering doc. Since `backgroundRenderTarget`/
 * `foregroundRenderTarget` are meant to cover the whole canvas, they need
 * to be resized right along with it.
 */
export const createResizeRenderTargetsEcsSystem = (
  renderContext: RenderContext,
  renderTargets: RenderTarget[],
): EcsSystem<[]> => ({
  query: [],
  update: () => {
    for (const renderTarget of renderTargets) {
      if (
        renderTarget.width === renderContext.width &&
        renderTarget.height === renderContext.height
      ) {
        continue;
      }

      renderTarget.resize(
        renderContext.gl,
        renderContext.width,
        renderContext.height,
      );
    }
  },
});
