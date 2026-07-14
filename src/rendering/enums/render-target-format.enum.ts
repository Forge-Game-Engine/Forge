/**
 * Type representing the keys of the `RENDER_TARGET_FORMAT` object.
 */
export type RENDER_TARGET_FORMAT_KEYS =
  (typeof RENDER_TARGET_FORMAT)[keyof typeof RENDER_TARGET_FORMAT];

/**
 * The `RENDER_TARGET_FORMAT` lookup defines the color texture storage a
 * `RenderTarget` allocates.
 */
export const RENDER_TARGET_FORMAT = {
  /**
   * 8-bit-per-channel color storage. Values are clamped to `[0, 1]` the
   * moment a fragment shader writes them. The default for every render
   * target.
   */
  ldr: 'ldr',

  /**
   * Half-float (`RGBA16F`) color storage. Values above `1` survive
   * intermediate passes instead of being clamped, so bloom and tone mapping
   * can operate on true HDR brightness. Requires the
   * `EXT_color_buffer_float` WebGL2 extension; silently falls back to `ldr`
   * when it's unavailable (see `resolveRenderTargetFormat`).
   */
  hdr: 'hdr',
} as const;
