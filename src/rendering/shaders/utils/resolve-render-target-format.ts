import {
  RENDER_TARGET_FORMAT,
  RENDER_TARGET_FORMAT_KEYS,
} from '../../enums/index.js';
import type { RenderContext } from '../../render-context.js';

/**
 * Resolves the color texture format a `RenderTarget` should actually
 * allocate, falling back to `RENDER_TARGET_FORMAT.ldr` when
 * `RENDER_TARGET_FORMAT.hdr` was requested but the context doesn't support
 * `EXT_color_buffer_float` (required to render into a half-float texture;
 * see `RenderContext.supportsHdrRenderTargets`).
 * @param renderContext - The render context the target belongs to.
 * @param requested - The format the caller asked for.
 * @returns The format to actually allocate.
 */
export function resolveRenderTargetFormat(
  renderContext: RenderContext,
  requested: RENDER_TARGET_FORMAT_KEYS,
): RENDER_TARGET_FORMAT_KEYS {
  if (requested === RENDER_TARGET_FORMAT.ldr) {
    return requested;
  }

  return renderContext.supportsHdrRenderTargets
    ? RENDER_TARGET_FORMAT.hdr
    : RENDER_TARGET_FORMAT.ldr;
}
