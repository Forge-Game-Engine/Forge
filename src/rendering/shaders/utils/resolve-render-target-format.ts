import {
  RENDER_TARGET_FORMAT,
  RENDER_TARGET_FORMAT_KEYS,
} from '../../enums/index.js';

/**
 * Resolves the color texture format a `RenderTarget` should actually
 * allocate, falling back to `RENDER_TARGET_FORMAT.ldr` when
 * `RENDER_TARGET_FORMAT.hdr` was requested but the context doesn't support
 * `EXT_color_buffer_float` (required to render into a half-float texture).
 *
 * Never calls `gl.getExtension` for `RENDER_TARGET_FORMAT.ldr`, so requesting
 * the default format has no extension-detection cost.
 * @param gl - The WebGL2 rendering context.
 * @param requested - The format the caller asked for.
 * @returns The format to actually allocate.
 */
export function resolveRenderTargetFormat(
  gl: WebGL2RenderingContext,
  requested: RENDER_TARGET_FORMAT_KEYS,
): RENDER_TARGET_FORMAT_KEYS {
  if (requested === RENDER_TARGET_FORMAT.ldr) {
    return requested;
  }

  return gl.getExtension('EXT_color_buffer_float')
    ? RENDER_TARGET_FORMAT.hdr
    : RENDER_TARGET_FORMAT.ldr;
}
